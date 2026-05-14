'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { createServerSupabase } from '@/lib/supabase/server'
import {
  parseSalesQuickbooks,
  parseSpringsList,
  parseUBoltList,
  parseConsumablesStock,
  detectFile,
  type SpecializedSheetType,
  type ParsedSalesRow,
  type ParsedProductRow,
  type ParsedStockRow,
} from '@/lib/import/specialized-parsers'
import {
  commitProductMaster,
  commitSalesImport,
  commitConsumablesImport,
  type CommitResult,
} from '@/lib/import/specialized-commit'
import {
  clearAliasCache,
} from '@/lib/import/alias-matcher'
import * as XLSX from 'xlsx'
import type { Branch } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

async function requireImporter() {
  const supabase = createServerSupabase()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) throw new Error('Not authenticated')
  const user = await prisma.user.findUnique({ where: { id: authUser.id } })
  if (!user) throw new Error('User not provisioned')
  if (user.role !== 'admin' && user.role !== 'manager') {
    throw new Error('Only admins and managers can import data')
  }
  return user
}

// ─────────────────────────────────────────────────────────────────────────────
// SPECIALIZED UPLOAD
//
// One-shot: parses the file, persists a preview-able batch, returns the count
// of rows ready for review. The user then clicks "Commit" on the batch page.
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadSpecialized(formData: FormData) {
  const user = await requireImporter()
  const file = formData.get('file') as File | null
  const sheetType = formData.get('sheet_type') as SpecializedSheetType | null
  const branchOverride = formData.get('branch') as Branch | null

  if (!file || file.size === 0) throw new Error('Please choose a file to upload')
  if (!sheetType) throw new Error('Please pick a file type')

  const buffer = await file.arrayBuffer()

  // Parse based on sheet type
  let parsedCount = 0
  let parsedPreview: any[] = []
  let sourceLabel = ''

  try {
    if (sheetType === 'sales_quickbooks_v2') {
      const rows = parseSalesQuickbooks(buffer)
      parsedCount = rows.length
      parsedPreview = rows.slice(0, 10)
      sourceLabel = 'QuickBooks sales export'
    } else if (sheetType === 'springs_master') {
      const rows = parseSpringsList(buffer)
      parsedCount = rows.length
      parsedPreview = rows.slice(0, 10)
      sourceLabel = 'Springs master list'
    } else if (sheetType === 'ubolt_master') {
      const rows = parseUBoltList(buffer)
      parsedCount = rows.length
      parsedPreview = rows.slice(0, 10)
      sourceLabel = 'U-bolt master list'
    } else if (sheetType === 'consumables_stock') {
      if (!branchOverride) throw new Error('Pick the branch this file belongs to')
      // Iterate all *IN-OUT* sheets and merge
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
      const inOutSheets = wb.SheetNames.filter((n) =>
        n.toUpperCase().includes('IN-OUT')
      )
      const merged: ParsedStockRow[] = []
      for (const name of inOutSheets) {
        try {
          const rows = parseConsumablesStock(buffer, name, branchOverride)
          merged.push(...rows)
        } catch (err) {
          // Skip sheets we can't parse — they may have a different layout
        }
      }
      parsedCount = merged.length
      parsedPreview = merged.slice(0, 10)
      sourceLabel = `Consumables stock — ${inOutSheets.length} sheets parsed`
    } else {
      throw new Error(`Unknown sheet type: ${sheetType}`)
    }
  } catch (err) {
    throw new Error(`Could not parse file: ${(err as Error).message}`)
  }

  if (parsedCount === 0) {
    throw new Error(
      `No usable rows found in the file. Check the format matches ${sourceLabel}.`
    )
  }

  // Persist the batch. We stash the parsed rows as raw_data on a single
  // marker ImportRow so the preview page can render them. The actual commit
  // re-parses the file from a stored buffer if we wanted to be paranoid;
  // for now, the user uploads → previews → commits in one session.
  const base64 = Buffer.from(buffer).toString('base64')

  const batch = await prisma.importBatch.create({
    data: {
      file_name: file.name,
      file_url: base64, // store buffer here for the commit step
      sheet_type: sheetType,
      import_mode: 'update',
      branch: branchOverride,
      status: 'preview',
      row_count: parsedCount,
      mapping_config: {
        specialized: true,
        source_label: sourceLabel,
        preview: parsedPreview,
      } as any,
      created_by: user.id,
    },
  })

  redirect(`/import/specialized/${batch.id}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMIT SPECIALIZED BATCH
// ─────────────────────────────────────────────────────────────────────────────

export async function commitSpecializedBatch(batchId: string): Promise<CommitResult> {
  const user = await requireImporter()

  const batch = await prisma.importBatch.findUnique({ where: { id: batchId } })
  if (!batch) throw new Error('Batch not found')
  if (batch.status === 'imported') throw new Error('Already imported')
  if (!batch.file_url) throw new Error('File buffer missing — re-upload required')

  const buffer = Buffer.from(batch.file_url, 'base64').buffer as ArrayBuffer
  const sheetType = batch.sheet_type as SpecializedSheetType

  // Refresh alias cache before matching
  clearAliasCache()

  let result: CommitResult

  try {
    if (sheetType === 'sales_quickbooks_v2') {
      const rows = parseSalesQuickbooks(buffer)
      result = await commitSalesImport(rows, batch.id, user.id)
    } else if (sheetType === 'springs_master') {
      const rows = parseSpringsList(buffer)
      result = await commitProductMaster(rows, user.org_id, batch.id, user.id)
    } else if (sheetType === 'ubolt_master') {
      const rows = parseUBoltList(buffer)
      result = await commitProductMaster(rows, user.org_id, batch.id, user.id)
    } else if (sheetType === 'consumables_stock') {
      if (!batch.branch) throw new Error('Branch not set on batch')
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
      const inOutSheets = wb.SheetNames.filter((n) =>
        n.toUpperCase().includes('IN-OUT')
      )
      const merged: ParsedStockRow[] = []
      for (const name of inOutSheets) {
        try {
          const parsed = parseConsumablesStock(buffer, name, batch.branch)
          merged.push(...parsed)
        } catch {}
      }
      result = await commitConsumablesImport(merged, batch.id, user.id)
    } else {
      throw new Error(`Unknown sheet type: ${sheetType}`)
    }
  } catch (err) {
    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: 'failed',
        error_summary: `Commit failed: ${(err as Error).message}`,
      },
    })
    throw err
  }

  await prisma.importBatch.update({
    where: { id: batchId },
    data: {
      status: 'imported',
      ok_count: result.written,
      skipped_count: result.skipped,
      error_count: result.errors.length,
      imported_at: new Date(),
      // Clear the base64 buffer now that commit is done — saves DB space
      file_url: null,
      error_summary: result.errors.length > 0
        ? result.errors.slice(0, 50).map((e) => `Row ${e.row}: ${e.error}`).join('\n')
        : null,
    },
  })

  revalidatePath('/import')
  revalidatePath('/products')
  revalidatePath('/sales')
  revalidatePath('/stock')

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-DETECT — used by the upload form to suggest the right type
// ─────────────────────────────────────────────────────────────────────────────

export async function detectUploadedFile(formData: FormData) {
  await requireImporter()
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    return { recommendedSheetType: 'unknown' as const, sheetNames: [], reason: 'No file' }
  }
  return detectFile(file)
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY FUNCTIONS — kept for backward compatibility
// ─────────────────────────────────────────────────────────────────────────────

export async function saveColumnMapping(batchId: string, mappings: Record<string, any>) {
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
  const columnMapping = {} // Simplified for now

  // Apply mappings and extract typed data
  const updates = rows.map(row => {
    const rawData = row.raw_data as Record<string, unknown>
    const mappedData: Record<string, unknown> = {}

    // Apply mappings
    for (const [header, field] of Object.entries(mappings)) {
      if (field === 'ignore') continue
      const value = rawData[header]
      if (value !== undefined) {
        mappedData[field] = value
      }
    }

    return {
      id: row.id,
      mapped_data: mappedData,
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

  // Update batch status to preview
  await prisma.importBatch.update({
    where: { id: batchId },
    data: { status: 'preview' },
  })

  revalidatePath(`/import/${batchId}`)
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

export async function approveAndSyncImport(batchId: string) {
  try {
    // For backward compatibility, assume this is a generic import
    // In practice, specialized imports should use commitSpecializedBatch
    await commitImportedData(batchId)
  } catch (error) {
    // Update batch status to failed on error
    await prisma.importBatch.update({
      where: { id: batchId },
      data: { status: 'failed' },
    })
    throw error
  }
}

async function commitImportedData(batchId: string) {
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

  // Process based on sheet type (simplified)
  if (batch.sheet_type === 'sales') {
    // Basic sales processing
    const user = await requireImporter()
    for (const row of batch.rows) {
      if (!row.resolved_product || !row.order_number) continue

      // Create basic sale record
      await prisma.saleOrder.create({
        data: {
          customerName: 'Imported Customer',
          totalAmount: 0, // Simplified
          status: 'CONFIRMED',
          createdBy: user.id,
        },
      })
    }
  }

  // Update batch status to completed
  await prisma.importBatch.update({
    where: { id: batchId },
    data: { status: 'imported' },
  })

  revalidatePath(`/import/${batchId}`)
}