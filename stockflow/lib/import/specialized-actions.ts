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
} from './specialized-parsers'
import {
  commitProductMaster,
  commitSalesImport,
  commitConsumablesImport,
  type CommitResult,
} from './specialized-commit'
import { clearAliasCache, rebuildAliasCache } from './alias-matcher'
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

  // Rebuild alias cache before matching to pick up newly-added aliases
  await rebuildAliasCache()

  let result: CommitResult

  try {
    if (sheetType === 'sales_quickbooks_v2') {
      const rows = parseSalesQuickbooks(buffer)
      result = await commitSalesImport(rows, batch.id, user.id)
    } else if (sheetType === 'springs_master') {
      const rows = parseSpringsList(buffer)
      result = await commitProductMaster(rows, user.organizationId || '', batch.id, user.id)
    } else if (sheetType === 'ubolt_master') {
      const rows = parseUBoltList(buffer)
      result = await commitProductMaster(rows, user.organizationId || '', batch.id, user.id)
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
      mapping_config: {
        specialized: true,
        unmatched_names: result.unmatchedNames ?? [],
        errors: result.errors,
      } as any,
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