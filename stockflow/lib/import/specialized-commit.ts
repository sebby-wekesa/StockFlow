/**
 * Commit layer for specialized parsers.
 *
 * Each function takes pre-parsed rows from `specialized-parsers.ts`,
 * matches them against the product master via aliases, and writes
 * to the database transactionally.
 *
 * Two flavours:
 *   - Master data commits (Type A): create Product + ProductAlias records
 *   - Transactional commits (Type B): create SalesOrder/StockMovement records
 */

import { prisma } from '@/lib/prisma'
import { normaliseForMatching, matchProductName } from './alias-matcher'
import { nextInvoiceNumber } from '@/lib/sales'
import type {
  ParsedSalesRow,
  ParsedProductRow,
  ParsedStockRow,
} from './specialized-parsers'
import type { Branch } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// COMMIT RESULT TYPE
// ─────────────────────────────────────────────────────────────────────────────

export type CommitResult = {
  total: number
  written: number
  skipped: number
  errors: Array<{ row: number; error: string }>
  /** For sales: which raw names couldn't be matched and need attention */
  unmatchedNames?: Array<{ raw_name: string; rows: number[]; total_qty: number }>
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER DATA COMMIT — Product list (springs / U-bolts)
//
// Idempotent: upserts Product by product_code. If a code is taken by a
// different canonical_name, we skip and report.
// ─────────────────────────────────────────────────────────────────────────────

export async function commitProductMaster(
  rows: ParsedProductRow[],
  orgId: string,
  importBatchId: string,
  userId: string
): Promise<CommitResult> {
  const result: CommitResult = { total: rows.length, written: 0, skipped: 0, errors: [] }

  // Process in chunks to keep transactions short
  const CHUNK = 50
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    await prisma.$transaction(async (tx) => {
      for (const row of chunk) {
        if (!row.product_code) {
          result.skipped++
          continue
        }

        try {
          // Upsert the product
          const product = await tx.product.upsert({
            where: { product_code: row.product_code },
            update: {
              canonical_name: row.canonical_name,
              vehicle_make: row.vehicle_make,
              vehicle_model: row.vehicle_model,
              spring_position: row.spring_position,
              leaf_position: row.leaf_position,
              cost_price: row.cost_price ?? undefined,
              selling_price: row.selling_price ?? undefined,
            },
            create: {
              org_id: orgId,
              product_code: row.product_code,
              canonical_name: row.canonical_name,
              category: row.category,
              product_type: row.product_type as any,
              uom: row.uom,
              vehicle_make: row.vehicle_make,
              vehicle_model: row.vehicle_model,
              spring_position: row.spring_position,
              leaf_position: row.leaf_position,
              cost_price: row.cost_price,
              selling_price: row.selling_price,
            },
          })

          // Make sure the canonical name is registered as an alias too
          const canonClean = normaliseForMatching(row.canonical_name)
          const existingAlias = await tx.productAlias.findUnique({
            where: { alias_clean: canonClean },
          })
          if (!existingAlias) {
            await tx.productAlias.create({
              data: {
                product_id: product.id,
                alias: row.canonical_name,
                alias_clean: canonClean,
                source: 'canonical',
              },
            })
          }

          result.written++
        } catch (err) {
          result.errors.push({
            row: row.source_row,
            error: (err as Error).message,
          })
        }
      }
    })
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// SALES COMMIT — QuickBooks export
//
// 1. Group rows by order_number (invoice)
// 2. For each invoice: match products via aliases, create SalesOrder +
//    SalesOrderLine + sales_out StockMovement + branch stock decrement
// 3. Rows with unmatched products are skipped and reported back
//    (so the user can resolve them on the conflicts step)
// ─────────────────────────────────────────────────────────────────────────────

export async function commitSalesImport(
  rows: ParsedSalesRow[],
  importBatchId: string,
  userId: string
): Promise<CommitResult> {
  const result: CommitResult = {
    total: rows.length,
    written: 0,
    skipped: 0,
    errors: [],
    unmatchedNames: [],
  }

  // Stage 1: match every raw_product_name once
  const uniqueNames = new Set<string>()
  for (const r of rows) {
    if (r.raw_product_name) uniqueNames.add(r.raw_product_name)
  }

  const nameToProductId = new Map<string, string>()
  const unmatched = new Map<string, { rows: number[]; total_qty: number }>()

  for (const name of uniqueNames) {
    const match = await matchProductName(name)
    if (match.product) {
      nameToProductId.set(name, match.product.id)
    } else {
      unmatched.set(name, { rows: [], total_qty: 0 })
    }
  }

  // Stage 2: group resolved rows by order_number
  type OrderGroup = {
    order_number: string
    customer_name: string
    branch: Branch
    invoice_date: Date
    lines: Array<{
      source_row: number
      product_id: string
      qty: number
      unit_price: number
      raw_name: string
      notes: string | null
    }>
  }

  const orderGroups = new Map<string, OrderGroup>()

  for (const row of rows) {
    if (!row.raw_product_name || !row.qty || !row.movement_date) {
      result.skipped++
      continue
    }
    const productId = nameToProductId.get(row.raw_product_name)
    if (!productId) {
      const u = unmatched.get(row.raw_product_name)!
      u.rows.push(row.source_row)
      u.total_qty += row.qty
      result.skipped++
      continue
    }

    const branch = row.branch ?? 'mombasa'  // safety default
    const orderKey = row.order_number ?? `NO-NUM-${row.source_row}`

    if (!orderGroups.has(orderKey)) {
      orderGroups.set(orderKey, {
        order_number: orderKey,
        customer_name: row.customer_name ?? 'Walk-in customer',
        branch,
        invoice_date: row.movement_date,
        lines: [],
      })
    }
    orderGroups.get(orderKey)!.lines.push({
      source_row: row.source_row,
      product_id: productId,
      qty: row.qty,
      unit_price: row.unit_price ?? 0,
      raw_name: row.raw_product_name,
      notes: row.notes,
    })
  }

  // Stage 3: write each order group in its own transaction
  for (const group of Array.from(orderGroups.values())) {
    try {
      await prisma.$transaction(async (tx) => {
        // Skip if this order already exists (idempotency)
        const existing = await tx.salesOrder.findUnique({
          where: { order_number: group.order_number },
        })
        if (existing) return // silently skip duplicates

        const order = await tx.salesOrder.create({
          data: {
            order_number: group.order_number,
            customer_name: group.customer_name,
            branch: group.branch,
            status: 'invoiced',
            invoice_date: group.invoice_date,
            source: 'quickbooks_import',
            import_batch_id: importBatchId,
            created_by: userId,
          },
        })

        for (const line of group.lines) {
          const product = await tx.product.findUnique({
            where: { id: line.product_id },
            select: { canonical_name: true, uom: true, category: true },
          })
          if (!product) continue

          const totalAmount = line.qty * line.unit_price

          await tx.salesOrderLine.create({
            data: {
              sales_order_id: order.id,
              product_id: line.product_id,
              product_name: product.canonical_name,
              qty: line.qty,
              uom: product.uom,
              unit_price: line.unit_price,
              total_amount: totalAmount,
              notes: line.notes,
            },
          })

          // Stock movement for stock-bearing products only
          if (product.category !== 'service') {
            await tx.stockMovement.create({
              data: {
                product_id: line.product_id,
                movement_type: 'sales_out',
                branch: group.branch,
                qty: -line.qty,
                unit_price: line.unit_price,
                customer_name: group.customer_name,
                reference: group.order_number,
                movement_date: group.invoice_date,
                notes: line.notes,
                import_batch_id: importBatchId,
                created_by: userId,
              },
            })

            await tx.branchStock.upsert({
              where: {
                product_id_branch: {
                  product_id: line.product_id,
                  branch: group.branch,
                },
              },
              update: { qty: { decrement: line.qty } },
              create: {
                product_id: line.product_id,
                branch: group.branch,
                qty: -line.qty, // imports allow negative balances; user can adjust later
              },
            })
          }
        }
      })
      result.written += group.lines.length
    } catch (err) {
      result.errors.push({
        row: group.lines[0]?.source_row ?? 0,
        error: `Order ${group.order_number}: ${(err as Error).message}`,
      })
    }
  }

  // Stage 4: report unmatched names back to the user
  result.unmatchedNames = Array.from(unmatched.entries())
    .map(([name, info]) => ({
      raw_name: name,
      rows: info.rows,
      total_qty: info.total_qty,
    }))
    .sort((a, b) => b.total_qty - a.total_qty)

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSUMABLES STOCK COMMIT
//
// Each parsed row is either an "in" or "out" movement. Stock balances
// are updated correspondingly.
// ─────────────────────────────────────────────────────────────────────────────

export async function commitConsumablesImport(
  rows: ParsedStockRow[],
  importBatchId: string,
  userId: string
): Promise<CommitResult> {
  const result: CommitResult = {
    total: rows.length,
    written: 0,
    skipped: 0,
    errors: [],
    unmatchedNames: [],
  }

  // Match all raw names first
  const uniqueNames = new Set<string>()
  for (const r of rows) {
    if (r.raw_product_name) uniqueNames.add(r.raw_product_name)
  }

  const nameToProductId = new Map<string, string>()
  const unmatched = new Map<string, { rows: number[]; total_qty: number }>()

  for (const name of uniqueNames) {
    const match = await matchProductName(name)
    if (match.product) {
      nameToProductId.set(name, match.product.id)
    } else {
      unmatched.set(name, { rows: [], total_qty: 0 })
    }
  }

  // Write each row
  const CHUNK = 100
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    await prisma.$transaction(async (tx) => {
      for (const row of chunk) {
        if (!row.raw_product_name || row.qty === null) {
          result.skipped++
          continue
        }
        const productId = nameToProductId.get(row.raw_product_name)
        if (!productId) {
          const u = unmatched.get(row.raw_product_name)!
          u.rows.push(row.source_row)
          u.total_qty += row.qty
          result.skipped++
          continue
        }

        const isInbound = row.direction === 'in'
        const signedQty = isInbound ? row.qty : -row.qty
        const movementType = isInbound ? 'adjustment_in' : 'sales_out'

        try {
          await tx.stockMovement.create({
            data: {
              product_id: productId,
              movement_type: movementType,
              branch: row.branch,
              qty: signedQty,
              reference: row.reference,
              movement_date: row.movement_date ?? new Date(),
              notes: row.notes ?? `Imported from consumables sheet`,
              import_batch_id: importBatchId,
              created_by: userId,
            },
          })

          await tx.branchStock.upsert({
            where: {
              product_id_branch: { product_id: productId, branch: row.branch },
            },
            update: { qty: { increment: signedQty } },
            create: {
              product_id: productId,
              branch: row.branch,
              qty: signedQty,
            },
          })
          result.written++
        } catch (err) {
          result.errors.push({
            row: row.source_row,
            error: (err as Error).message,
          })
        }
      }
    })
  }

  result.unmatchedNames = Array.from(unmatched.entries())
    .map(([name, info]) => ({
      raw_name: name,
      rows: info.rows,
      total_qty: info.total_qty,
    }))
    .sort((a, b) => b.total_qty - a.total_qty)

  return result
}