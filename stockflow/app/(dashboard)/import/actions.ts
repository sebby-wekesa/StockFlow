'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/auth'
import { parseExcelFile, detectSheetType, type SheetType, extractDate, extractNumber, extractString, extractBranch } from '@/lib/import/parsers'
import { normaliseForMatching } from '@/lib/import/alias-matcher'
import type { ImportMode, ImportField } from '@prisma/client'

export async function uploadImport(formData: FormData) {
  const user = await getUser()
  if (!user) throw new Error('Not authenticated')

  const file = formData.get('file') as File
  if (!file) throw new Error('No file provided')

  const sheetType = formData.get('sheet_type') as SheetType
  if (!sheetType) throw new Error('No sheet type selected')

  const importMode = (formData.get('import_mode') as ImportMode) || 'update'
  const targetBranch = formData.get('target_branch') as string || null

  // Parse the Excel file
  const parsedFile = await parseExcelFile(file)

  // Auto-detect sheet type if not provided
  const detectedType = detectSheetType(parsedFile.headers)
  const finalSheetType = sheetType !== 'auto' ? sheetType : detectedType
  if (!finalSheetType) {
    throw new Error('Could not detect sheet type. Please select manually.')
  }

  // Create the import batch
  const batch = await prisma.importBatch.create({
    data: {
      file_name: file.name,
      sheet_type: finalSheetType,
      import_mode: importMode,
      target_branch: targetBranch,
      status: 'uploaded',
      row_count: parsedFile.totalRows,
      created_by: user.id,
    },
  })

  // Create import rows in chunks to avoid query size limits
  const chunkSize = 500
  for (let i = 0; i < parsedFile.rows.length; i += chunkSize) {
    const chunk = parsedFile.rows.slice(i, i + chunkSize)

    await prisma.importRow.createMany({
      data: chunk.map((row, index) => ({
        batch_id: batch.id,
        row_number: i + index + 2, // +2 because Excel rows start at 1, and we skip header
        raw_data: row,
      })),
    })
  }

  revalidatePath('/import')
  redirect(`/import/${batch.id}`)
}

export async function saveColumnMapping(batchId: string, mappings: Record<string, ImportField>) {
  // Update batch status to validating
  await prisma.importBatch.update({
    where: { id: batchId },
    data: { status: 'validating' },
  })

  // Get all rows for this batch
  const rows = await prisma.importRow.findMany({
    where: { batch_id: batchId },
    orderBy: { row_number: 'asc' },
  })

  // Apply mappings and extract typed data
  const updates = rows.map(row => {
    const rawData = row.raw_data as Record<string, unknown>
    const mappedData: Record<string, unknown> = {}

    for (const [header, field] of Object.entries(mappings)) {
      if (field === 'ignore') continue

      const value = rawData[header]
      let extractedValue: unknown

      switch (field) {
        case 'movement_date':
          extractedValue = extractDate(value)
          break
        case 'qty':
        case 'unit_price':
        case 'unit_cost':
          extractedValue = extractNumber(value)
          break
        case 'branch':
          extractedValue = extractBranch(value)
          break
        default:
          extractedValue = extractString(value)
      }

      if (extractedValue !== null) {
        mappedData[field] = extractedValue
      }
    }

    return {
      id: row.id,
      mapped_data: mappedData,
      order_number: mappedData.order_number as string,
      customer_name: mappedData.customer_name as string,
      qty: mappedData.qty as number,
      unit_price: mappedData.unit_price as number,
      notes: mappedData.notes as string,
    }
  })

  // Update rows in chunks
  const chunkSize = 100
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize)
    await Promise.all(
      chunk.map(update =>
        prisma.importRow.update({
          where: { id: update.id },
          data: update,
        })
      )
    )
  }

  // Start product matching
  await runProductMatching(batchId)

  revalidatePath(`/import/${batchId}`)
}

async function runProductMatching(batchId: string) {
  // Get all products for matching
  const products = await prisma.product.findMany({
    include: { aliases: true },
  })

  // Create a map of normalized names to product IDs
  const productMap = new Map<string, string>()
  for (const product of products) {
    const normalizedName = normaliseForMatching(product.name)
    productMap.set(normalizedName, product.id)

    for (const alias of product.aliases) {
      const normalizedAlias = normaliseForMatching(alias.alias)
      productMap.set(normalizedAlias, product.id)
    }
  }

  // Get rows that need matching
  const rows = await prisma.importRow.findMany({
    where: {
      batch_id: batchId,
      mapped_data: { not: null },
    },
  })

  // Match products
  const updates = rows.map(row => {
    const mappedData = row.mapped_data as Record<string, unknown>
    const rawProductName = mappedData.raw_product_name as string

    if (!rawProductName) {
      return { id: row.id, matched_product: null, match_confidence: null }
    }

    const normalizedInput = normaliseForMatching(rawProductName)
    const matchedProductId = productMap.get(normalizedInput)

    // Simple confidence scoring (exact match = 1.0, no match = 0)
    const confidence = matchedProductId ? 1.0 : 0

    return {
      id: row.id,
      matched_product: matchedProductId,
      match_confidence: confidence,
      resolution: matchedProductId ? 'auto' : null,
      resolved_product: matchedProductId,
    }
  })

  // Update rows
  const chunkSize = 100
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize)
    await Promise.all(
      chunk.map(update =>
        prisma.importRow.update({
          where: { id: update.id },
          data: update,
        })
      )
    )
  }

  // Update batch status to preview
  await prisma.importBatch.update({
    where: { id: batchId },
    data: { status: 'preview' },
  })
}

export async function resolveConflict(batchId: string, rowId: string, productId: string) {
  // Update the row with the resolved product
  await prisma.importRow.update({
    where: { id: rowId },
    data: {
      resolved_product: productId,
      resolution: 'manual',
    },
  })

  // Add alias to prevent future conflicts
  const row = await prisma.importRow.findUnique({
    where: { id: rowId },
  })

  if (row?.mapped_data) {
    const mappedData = row.mapped_data as Record<string, unknown>
    const rawProductName = mappedData.raw_product_name as string

    if (rawProductName) {
      await prisma.productAlias.upsert({
        where: {
          product_id_alias: {
            product_id: productId,
            alias: rawProductName,
          },
        },
        update: {},
        create: {
          product_id: productId,
          alias: rawProductName,
        },
      })
    }
  }

  revalidatePath(`/import/${batchId}`)
}

export async function commitImport(batchId: string) {
  // Update batch status to committing
  await prisma.importBatch.update({
    where: { id: batchId },
    data: { status: 'committing' },
  })

  // Get batch details
  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: { rows: true },
  })

  if (!batch) throw new Error('Batch not found')

  // Group rows by order_number for sales imports
  const orderGroups = new Map<string, typeof batch.rows>()

  for (const row of batch.rows) {
    if (!row.resolved_product || !row.order_number) continue

    const orderNum = row.order_number
    if (!orderGroups.has(orderNum)) {
      orderGroups.set(orderNum, [])
    }
    orderGroups.get(orderNum)!.push(row)
  }

  // Process each order
  for (const [, rows] of orderGroups) {
    await prisma.$transaction(async (tx) => {
      // Create sales order
      const saleOrder = await tx.saleOrder.create({
        data: {
          customerName: rows[0].customer_name || 'Imported Customer',
          totalAmount: rows.reduce((sum, r) => sum + ((r.qty || 0) * (r.unit_price || 0)), 0),
          status: 'CONFIRMED', // Imported sales are confirmed
        },
      })

      // Create sale items
      for (const row of rows) {
        if (!row.resolved_product) continue

        await tx.saleItem.create({
          data: {
            saleOrderId: saleOrder.id,
            finishedGoodsId: row.resolved_product,
            quantity: row.qty || 0,
            unitPrice: row.unit_price || 0,
            totalPrice: (row.qty || 0) * (row.unit_price || 0),
          },
        })

        // Create stock movement (sales_out)
        // For now, assume default branch. In a real app, you'd map from import data
        const branchCode = batch.target_branch || 'mombasa'
        const branch = await tx.branch.findFirst({
          where: { code: branchCode },
        })

        if (branch) {
          await tx.inventoryFinishedGoods.updateMany({
            where: {
              branchId: branch.id,
              finishedGoodsId: row.resolved_product,
            },
            data: {
              availableQty: { decrement: row.qty || 0 },
            },
          })
        }
      }
    })
  }

  // Update batch status to imported
  await prisma.importBatch.update({
    where: { id: batchId },
    data: { status: 'imported' },
  })

  revalidatePath(`/import/${batchId}`)
}