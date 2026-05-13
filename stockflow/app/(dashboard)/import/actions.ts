'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/auth'
import { parseExcelFile, detectSheetType, type SheetType, extractDate, extractNumber, extractString, extractBranch } from '@/lib/import/parsers'
import { normaliseForMatching } from '@/lib/import/alias-matcher'
import { SHEET_MAPPINGS } from '@/lib/import/column-mappings'
import { processMombasaInventory } from '@/lib/import/mombasa-processors'
import type { ImportMode, ImportField } from '@prisma/client'

export async function uploadImport(formData: FormData) {
  try {
    console.log('uploadImport called with formData keys:', Array.from(formData.keys()))

    const user = await getUser()
    if (!user) throw new Error('Not authenticated')

    const file = formData.get('file') as File
    console.log('File received:', { name: file?.name, size: file?.size, type: file?.type })
    if (!file) throw new Error('No file provided')
    if (file.size === 0) throw new Error('File is empty')
    if (!file.name.match(/\.(xlsx|xls)$/i)) throw new Error('File must be an Excel file (.xlsx or .xls)')

    const sheetType = formData.get('sheet_type') as string
    const importMode = (formData.get('import_mode') as ImportMode) || 'update'
    const targetBranch = formData.get('target_branch') as string || null

    console.log('Form data:', { sheetType, importMode, targetBranch })

    // Parse the Excel file
    let parsedFile
    try {
      parsedFile = await parseExcelFile(file)
    } catch (error) {
      console.error('Excel parsing error:', error)
      throw new Error('Failed to parse Excel file. Please ensure it\'s a valid Excel file.')
    }

    if (parsedFile.rows.length === 0) {
      throw new Error('Excel file contains no data rows.')
    }

    // Auto-detect sheet type if not provided or set to auto
    const detectedType = detectSheetType(parsedFile.headers)
    const finalSheetType = sheetType && sheetType !== 'auto' ? sheetType as SheetType : detectedType

    if (!finalSheetType) {
      throw new Error(`Could not detect sheet type automatically. Please select the appropriate sheet type manually. Detected headers: ${parsedFile.headers.join(', ')}`)
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
    return { success: true, batchId: batch.id }
  } catch (error) {
    console.error("Upload Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Upload failed" };
  }
}

export async function saveColumnMapping(batchId: string, mappings: Record<string, ImportField>) {
  // Get batch details
  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
  })

  if (!batch) throw new Error('Batch not found')

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

  // Get column mapping for this sheet type
  const columnMapping = SHEET_MAPPINGS[batch.sheet_type] || SHEET_MAPPINGS.inventory

  // Apply mappings and extract typed data
  const updates = rows.map(row => {
    const rawData = row.raw_data as Record<string, unknown>
    const mappedData: Record<string, unknown> = {}

    // Auto-map columns based on predefined mapping
    for (const [header, config] of Object.entries(columnMapping)) {
      if (rawData[header] !== undefined) {
        const value = rawData[header]
        let extractedValue: unknown

        if (config.transform) {
          extractedValue = config.transform(value)
        } else {
          // Default transformations based on field type
          switch (config.targetField) {
            case 'movement_date':
              extractedValue = extractDate(value)
              break
            case 'qty':
            case 'unit_price':
            case 'unit_cost':
            case 'opening_stock':
            case 'stock_in':
            case 'stock_out':
            case 'reorder_level':
              extractedValue = extractNumber(value)
              break
            case 'branch':
              extractedValue = extractBranch(value)
              break
            default:
              extractedValue = extractString(value)
          }
        }

        if (extractedValue !== null && extractedValue !== undefined) {
          mappedData[config.targetField] = extractedValue
        }
      }
    }

    // Also store original mappings for backward compatibility
    for (const [header, field] of Object.entries(mappings)) {
      if (field === 'ignore') continue
      const value = rawData[header]
      if (value !== undefined) {
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

// Generic import processing function
async function processImportedData(batchId: string) {
  // Update batch status to processing
  await prisma.importBatch.update({
    where: { id: batchId },
    data: { status: 'processing' },
  })

  // Get batch details with all resolved rows
  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: {
      rows: {
        where: { resolved_product: { not: null } },
        orderBy: { row_number: 'asc' }
      }
    },
  })

  if (!batch) throw new Error('Batch not found')
  if (batch.rows.length === 0) throw new Error('No resolved rows to process')

  const user = await getUser()
  if (!user) throw new Error('User not found')

  // Process based on sheet type
  switch (batch.sheet_type) {
    case 'sales':
      await processSalesImport(batch, user.id)
      break
    case 'inventory':
      await processInventoryImport(batch, user.id)
      break
    case 'stock_movement':
      await processStockMovementImport(batch, user.id)
      break
    default:
      throw new Error(`Unsupported sheet type: ${batch.sheet_type}`)
  }

  // Update batch status to completed
  await prisma.importBatch.update({
    where: { id: batchId },
    data: { status: 'completed' },
  })

  revalidatePath(`/import/${batchId}`)
}

async function processSalesImport(batch: any, userId: string) {
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
  for (const [orderNum, rows] of orderGroups) {
    await prisma.$transaction(async (tx) => {
      // Check if order already exists (prevent duplicates)
      const existingOrder = await tx.saleOrder.findFirst({
        where: {
          // You might want to add an import_reference field to SaleOrder
          // For now, we'll check by customer + total amount + date
          customerName: rows[0].customer_name || 'Imported Customer',
          totalAmount: rows.reduce((sum, r) => sum + ((r.qty || 0) * (r.unit_price || 0)), 0),
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
          },
        },
        include: { SaleItem: true },
      })

      if (existingOrder) {
        // Order already exists, skip to prevent duplicates
        console.log(`Skipping duplicate order ${orderNum} - already exists as ${existingOrder.id}`)
        return
      }

      // Create sales order
      const saleOrder = await tx.saleOrder.create({
        data: {
          customerName: rows[0].customer_name || 'Imported Customer',
          totalAmount: rows.reduce((sum, r) => sum + ((r.qty || 0) * (r.unit_price || 0)), 0),
          status: 'CONFIRMED', // Imported sales are confirmed
          createdBy: userId,
          // Consider adding import_reference: `IMPORT-${batch.id}-${orderNum}`
        },
      })

      // Create sale items and update inventory
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

        // Update inventory (decrease stock) - only if not already processed
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

          // Create audit log
          await tx.auditLog.create({
            data: {
              userId,
              action: 'IMPORT_SALES',
              entityType: 'SaleOrder',
              entityId: saleOrder.id,
              details: `Imported sale: ${row.qty} units of product ${row.resolved_product}`,
            },
          })
        }
      }
    })
  }
}

async function processInventoryImport(batch: any, userId: string) {
  // Use the specialized Mombasa inventory processor
  const results = await processMombasaInventory(
    batch.id,
    batch.rows.map((row: any) => row.mapped_data || {}),
    Object.keys(batch.rows[0]?.mapped_data || {}),
    userId
  )

  console.log(`Mombasa inventory processing results:`, results)

  return results
}

      // Create stock movement record for history
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          branchId: branchCode,
          movementType: 'adjustment',
          quantity: balance,
          reference: `IMPORT-${batch.id}`,
          notes: `Mombasa inventory import - ${batch.sheet_type}`,
        },
      })

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'IMPORT_INVENTORY',
          entityType: 'Product',
          entityId: product.id,
          details: `Inventory import: ${name} - ${balance} units`,
        },
      })
    }
  })
}

// Helper functions removed - now handled by mombasa-processors
    }
  })
}

function determineStockStatus(quantity: number, reorderLevel?: number): any {
  if (quantity <= 0) return 'OUT_OF_STOCK'
  if (reorderLevel && quantity <= reorderLevel) return 'REORDER_NEEDED'
  if (reorderLevel && quantity <= reorderLevel * 1.5) return 'LOW_STOCK'
  return 'AVAILABLE'
}

async function processStockMovementImport(batch: any, userId: string) {
  await prisma.$transaction(async (tx) => {
    for (const row of batch.rows) {
      if (!row.resolved_product) continue

      const mappedData = row.mapped_data as Record<string, unknown>
      const movementType = (mappedData.movement_type as string) || 'adjustment'
      const quantity = row.qty || 0
      const branchCode = batch.target_branch || 'mombasa'
      const branch = await tx.branch.findFirst({
        where: { code: branchCode },
      })

      if (branch) {
        // Calculate quantity change based on movement type
        const quantityChange = movementType === 'stock_in' ? quantity : -quantity

        // Update product current stock
        await tx.product.update({
          where: { id: row.resolved_product },
          data: {
            currentStock: { increment: quantityChange },
            updatedAt: new Date(),
          },
        })

        // Create stock movement record
        await tx.stockMovement.create({
          data: {
            productId: row.resolved_product,
            branchId: branch.id,
            movementType: movementType,
            quantity: quantityChange,
            reference: `IMPORT-${batch.id}`,
            notes: mappedData.notes as string,
          },
        })

        // Create audit log
        await tx.auditLog.create({
          data: {
            userId,
            action: 'IMPORT_STOCK_MOVEMENT',
            entityType: 'Product',
            entityId: row.resolved_product,
            details: `Stock movement: ${quantityChange > 0 ? '+' : ''}${quantityChange} units (${movementType})`,
          },
        })
      }
    }
  })
}

export async function commitImport(batchId: string) {
  try {
    await processImportedData(batchId)
  } catch (error) {
    // Update batch status to failed on error
    await prisma.importBatch.update({
      where: { id: batchId },
      data: { status: 'failed' },
    })
    throw error
  }
}

export async function approveAndSyncImport(batchId: string) {
  try {
    await processImportedData(batchId)
  } catch (error) {
    // Update batch status to failed on error
    await prisma.importBatch.update({
      where: { id: batchId },
      data: { status: 'failed' },
    })
    throw error
  }
}