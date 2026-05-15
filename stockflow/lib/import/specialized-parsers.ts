/**
 * Specialized parsers for the actual Excel formats Springtech uses.
 *
 * These files have non-standard layouts that the generic `sheet_to_json`
 * approach can't handle:
 *
 *   - QuickBooks sales export has headers in scattered columns with
 *     interleaved product-group headers and "Total" subtotal rows
 *   - Springs master list has vehicle-make group rows followed by
 *     product rows with code in column 2
 *   - U-bolt list has headers in row 2 not row 1
 *   - Stock files have three side-by-side tables (in / out / balance)
 *     starting at row 5
 *
 * Each parser knows its format and produces a clean normalized array
 * of rows ready for matching + commit.
 */

import * as XLSX from 'xlsx'
import type { Branch } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZED OUTPUT TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** A row destined for the SalesOrder + SalesOrderLine + sales_out flow */
export type ParsedSalesRow = {
  source_row: number
  movement_date: Date | null
  order_number: string | null
  raw_product_name: string | null
  customer_name: string | null
  branch: Branch | null
  qty: number | null
  unit_price: number | null
  amount: number | null
  notes: string | null
}

/** A row destined for the Product master (springs / U-bolts) */
export type ParsedProductRow = {
  source_row: number
  product_code: string | null
  canonical_name: string
  category: 'manufactured_spring' | 'manufactured_ubolt' | 'imported' | 'local_purchase'
  product_type: string
  uom: 'pcs' | 'set'
  vehicle_make: string | null
  vehicle_model: string | null
  spring_position: string | null
  leaf_position: string | null
  cost_price: number | null
  selling_price: number | null
}

/** A row destined for stock import (opening balance or movement) */
export type ParsedStockRow = {
  source_row: number
  movement_date: Date | null
  raw_product_name: string | null
  branch: Branch
  qty: number | null
  direction: 'in' | 'out' | 'balance'
  reference: string | null
  notes: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET TYPE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

export type SpecializedSheetType =
  | 'sales_quickbooks_v2'
  | 'springs_master'
  | 'ubolt_master'
  | 'consumables_stock'

export type DetectResult = {
  recommendedSheetType: SpecializedSheetType | 'unknown'
  sheetNames: string[]
  reason: string
}

export function detectFile(file: File): Promise<DetectResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const buffer = reader.result as ArrayBuffer
        const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
        const sheetNames = wb.SheetNames

        // Check for QuickBooks sales export
        if (sheetNames.length === 1) {
          const ws = wb.Sheets[sheetNames[0]]
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]
          if (rows.length > 1) {
            // Look for "Invoice" in column H (7)
            const hasInvoiceType = rows.some((row) => toStr(getCell(row, 7)) === 'Invoice')
            if (hasInvoiceType) {
              return resolve({
                recommendedSheetType: 'sales_quickbooks_v2',
                sheetNames,
                reason: 'Found "Invoice" entries in column H — looks like QuickBooks export',
              })
            }
          }
        }

        // Check for springs master
        if (sheetNames.includes('SPRINGS LIST')) {
          return resolve({
            recommendedSheetType: 'springs_master',
            sheetNames,
            reason: 'Found "SPRINGS LIST" sheet',
          })
        }

        // Check for U-bolt master
        if (sheetNames.includes('U BOLT LIST')) {
          return resolve({
            recommendedSheetType: 'ubolt_master',
            sheetNames,
            reason: 'Found "U BOLT LIST" sheet',
          })
        }

        // Check for consumables stock (sheets ending with IN-OUT)
        const inOutSheets = sheetNames.filter((n) => n.toUpperCase().includes('IN-OUT'))
        if (inOutSheets.length > 0) {
          return resolve({
            recommendedSheetType: 'consumables_stock',
            sheetNames,
            reason: `Found ${inOutSheets.length} sheets ending with "IN-OUT"`,
          })
        }

        return resolve({
          recommendedSheetType: 'unknown',
          sheetNames,
          reason: 'No recognizable patterns found',
        })
      } catch (err) {
        return resolve({
          recommendedSheetType: 'unknown',
          sheetNames: [],
          reason: `Parse error: ${(err as Error).message}`,
        })
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
>>>>>>> 67b50c242752acb2edbf7c42ea15ef3cd4b7f0d6
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getCell(row: unknown[], col: number): unknown {
  return col < row.length ? row[col] : undefined
}

function toStr(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  return s === '' ? null : s
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return value
  // Handle Excel formulas that return numbers — these come through as strings starting with =
  const str = String(value).replace(/[,\s]/g, '')
  if (str.startsWith('=')) return null // formula not pre-evaluated
  const n = Number(str)
  return isNaN(n) ? null : n
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  // Excel sometimes gives serial numbers
  if (typeof value === 'number') {
    // Excel epoch is 1899-12-30 (with leap year bug)
    const epoch = new Date(1899, 11, 30)
    return new Date(epoch.getTime() + value * 86400000)
  }
<<<<<<< HEAD
  const parsed = new Date(String(value))
  return isNaN(parsed.getTime()) ? null : parsed
}

function normaliseBranch(value: unknown): Branch | null {
  const s = toStr(value)
  if (!s) return null
  const lower = s.toLowerCase()
  if (lower.includes('mombasa')) return 'mombasa'
  if (lower.includes('nairobi')) return 'nairobi'
  if (lower.includes('bonje')) return 'bonje'
  // "Upcountry" is QuickBooks shorthand for upcountry (inland) sales — ship out of Mombasa HQ
=======
  const str = String(value).trim()
  if (!str) return null
  const parsed = new Date(str)
  if (isNaN(parsed.getTime())) return null
  return parsed
}

function normaliseBranch(value: unknown): Branch | null {
  const str = toStr(value)
  if (!str) return null
  const lower = str.toLowerCase()
  if (lower.includes('mombasa')) return 'mombasa'
  if (lower.includes('nairobi')) return 'nairobi'
  if (lower.includes('bonje')) return 'bonje'
  // Handle "Upcountry" as Mombasa
>>>>>>> 67b50c242752acb2edbf7c42ea15ef3cd4b7f0d6
  if (lower.includes('upcountry')) return 'mombasa'
  return null
}

<<<<<<< HEAD
/** Read a sheet as an array of rows (each row is an array of cell values). */
function readSheetAsRows(buffer: ArrayBuffer, sheetName?: string): {
  rows: unknown[][]
  sheetNames: string[]
  selectedSheet: string
} {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheet = sheetName ?? wb.SheetNames[0]
  const ws = wb.Sheets[sheet]
  if (!ws) {
    throw new Error(
      `Sheet "${sheet}" not found. Available: ${wb.SheetNames.join(', ')}`
    )
  }
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,        // get rows as arrays, not objects
    defval: null,
    raw: false,       // get formatted dates as Date objects
    blankrows: false,
  })
  return { rows, sheetNames: wb.SheetNames, selectedSheet: sheet }
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSER 1 — QuickBooks Sales Export
//
// Header row at row 1, columns scattered:
//   col 7  = Type ("Invoice")
//   col 9  = Date
//   col 11 = Num (invoice number)
//   col 13 = Memo (raw product name)
//   col 15 = Name (customer)
//   col 17 = Class (branch)
//   col 19 = Qty
//   col 21 = U/M
//   col 23 = Sales Price
//   col 25 = Amount
//
// Other rows are noise:
//   - Bare product names in col 2 (group headers like "BEARING 804358 (BEARING 804358)")
//   - "Total X" rows in col 2 with SUM formulas (subtotals)
//   - Empty separator rows
=======
function readSheetAsRows(buffer: ArrayBuffer, sheetName?: string) {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const targetSheet = sheetName ?? wb.SheetNames[0]
  const ws = wb.Sheets[targetSheet]
  if (!ws) throw new Error(`Sheet "${targetSheet}" not found`)
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][]
  return { rows, wb, ws }
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSER 1 — QuickBooks sales export
//
// Column layout:
//   7: Type (we filter to "Invoice")
//   9: Date
//   11: Num (invoice number)
//   13: Memo (product name)
//   15: Name (customer)
//   17: Class (branch)
//   19: Qty
//   23: Sales Price
//   25: Amount
>>>>>>> 67b50c242752acb2edbf7c42ea15ef3cd4b7f0d6
//
// We only keep rows where col 7 === "Invoice".
// ─────────────────────────────────────────────────────────────────────────────

export function parseSalesQuickbooks(buffer: ArrayBuffer): ParsedSalesRow[] {
  const { rows } = readSheetAsRows(buffer)
  const out: ParsedSalesRow[] = []

  // Skip header row (row 1, index 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const typeCell = toStr(getCell(row, 7))
    if (typeCell !== 'Invoice') continue

    const qty = toNumber(getCell(row, 19))
    const memo = toStr(getCell(row, 13))
    if (qty === null || !memo) continue // require qty and product name

    const originalBranchLabel = toStr(getCell(row, 17))
    const normalisedBranch = normaliseBranch(originalBranchLabel)
    // If the original was "Upcountry", note it so the audit trail preserves it
    const branchNote =
      originalBranchLabel && originalBranchLabel.toLowerCase().includes('upcountry')
        ? `Upcountry sale (assigned to Mombasa)`
        : null

    out.push({
      source_row: i + 1, // 1-indexed for user-facing reference
      movement_date: toDate(getCell(row, 9)),
      order_number: toStr(getCell(row, 11)),
      raw_product_name: memo,
      customer_name: toStr(getCell(row, 15)),
      branch: normalisedBranch,
      qty: Math.abs(Math.round(qty)),
      unit_price: toNumber(getCell(row, 23)),
      amount: toNumber(getCell(row, 25)),
      notes: branchNote,
    })
  }

  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSER 2 — Springs master list
//
// Sheet: SPRINGS LIST
// Pattern:
//   Vehicle-make group row: single cell in column 1, no code in column 2
//     e.g. "BEDFORD J6"
//   Product row: name in column 1, code in column 2
//     e.g. ["BEDFORD J6 FRONT SPRING ASSLY 9L", "BEDFORD/FSA9LF"]
//
// We track the current vehicle make as we iterate, and emit product rows.
// ─────────────────────────────────────────────────────────────────────────────

export function parseSpringsList(buffer: ArrayBuffer): ParsedProductRow[] {
  const { rows } = readSheetAsRows(buffer, 'SPRINGS LIST')
  const out: ParsedProductRow[] = []
  let currentMake: string | null = null

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
<<<<<<< HEAD
    const nameCell = toStr(getCell(row, 0))
    const codeCell = toStr(getCell(row, 1))

    if (!nameCell) continue

    // Group header: only column 0 has content
    if (!codeCell) {
      currentMake = nameCell
      continue
    }

    // Product row: name + code present
    const lowerName = nameCell.toLowerCase()
    const spring_position =
      lowerName.includes('front') ? 'Front' :
      lowerName.includes('rear') ? 'Rear' :
      lowerName.includes('helper') ? 'Helper' :
      null
    const leaf_position =
      lowerName.includes('main leaf') ? 'Main Leaf' :
      lowerName.includes('2nd leaf') ? '2nd Leaf' :
      lowerName.includes('3rd leaf') ? '3rd Leaf' :
      lowerName.includes('4th leaf') ? '4th Leaf' :
      lowerName.includes('5th leaf') ? '5th Leaf' :
      lowerName.includes('assly') || lowerName.includes('assembly') ? null :
      null

    const product_type =
      lowerName.includes('assly') || lowerName.includes('assembly')
        ? 'spring_assembly'
        : lowerName.includes('helper')
        ? 'helper_spring'
        : 'leaf_spring'

    out.push({
      source_row: i + 1,
      product_code: codeCell,
      canonical_name: nameCell,
=======
    const col1 = toStr(getCell(row, 0))
    const col2 = toStr(getCell(row, 1))

    // Check if this is a vehicle make group row
    if (col1 && !col2 && col1 === col1.toUpperCase() && col1.length > 3) {
      currentMake = col1.trim()
      continue
    }

    // Skip if no name or code
    if (!col1 || !col2) continue

    const name = col1.trim()
    const code = col2.trim()

    // Skip headers
    if (name.toLowerCase().includes('description') || code.toLowerCase().includes('code')) continue

    // Infer spring details from name
    const { spring_position, leaf_position, product_type } = inferSpringDetails(name)

    out.push({
      source_row: i + 1,
      product_code: code,
      canonical_name: name,
>>>>>>> 67b50c242752acb2edbf7c42ea15ef3cd4b7f0d6
      category: 'manufactured_spring',
      product_type,
      uom: 'pcs',
      vehicle_make: currentMake,
<<<<<<< HEAD
      vehicle_model: currentMake?.split(/\s+/)[0] ?? null,
=======
      vehicle_model: null,
>>>>>>> 67b50c242752acb2edbf7c42ea15ef3cd4b7f0d6
      spring_position,
      leaf_position,
      cost_price: null,
      selling_price: null,
    })
  }

  return out
}

<<<<<<< HEAD
=======
function inferSpringDetails(name: string): { spring_position: string | null; leaf_position: string | null; product_type: string } {
  const lower = name.toLowerCase()

  let spring_position: string | null = null
  let leaf_position: string | null = null
  const product_type = 'spring'

  if (lower.includes('front')) {
    spring_position = 'front'
  } else if (lower.includes('rear')) {
    spring_position = 'rear'
  } else if (lower.includes('helper') || lower.includes('aux')) {
    spring_position = 'helper'
  }

  if (lower.includes('main leaf') || lower.includes('main')) {
    leaf_position = 'main leaf'
  } else if (lower.includes('2nd leaf') || lower.includes('second')) {
    leaf_position = '2nd leaf'
  } else if (lower.includes('3rd leaf') || lower.includes('third')) {
    leaf_position = '3rd leaf'
  } else if (lower.includes('4th leaf') || lower.includes('fourth')) {
    leaf_position = '4th leaf'
  } else if (lower.includes('5th leaf') || lower.includes('fifth')) {
    leaf_position = '5th leaf'
  }

  return { spring_position, leaf_position, product_type }
}

>>>>>>> 67b50c242752acb2edbf7c42ea15ef3cd4b7f0d6
// ─────────────────────────────────────────────────────────────────────────────
// PARSER 3 — U-bolt master list
//
// Sheet: U BOLT LIST
<<<<<<< HEAD
// Row 2 has headers: Product Description | UOM | Cost Price | Selling Price
// Data starts row 3.
//
// We generate codes from the product description since the source file
// doesn't have explicit codes.
=======
// Headers are in row 2, data starts at row 3.
// Similar to springs but simpler structure.
>>>>>>> 67b50c242752acb2edbf7c42ea15ef3cd4b7f0d6
// ─────────────────────────────────────────────────────────────────────────────

export function parseUBoltList(buffer: ArrayBuffer): ParsedProductRow[] {
  const { rows } = readSheetAsRows(buffer, 'U BOLT LIST')
  const out: ParsedProductRow[] = []

<<<<<<< HEAD
  // Data starts at row 3 (index 2)
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i]
    const name = toStr(getCell(row, 0))
    if (!name) continue

    // Skip header repeats and section labels
    if (name.toLowerCase().includes('product description')) continue

    const cost = toNumber(getCell(row, 2))
    const selling = toNumber(getCell(row, 3))

    // Generate code from the name: take meaningful tokens
    // e.g. "F/UBOLT FH 215 8''(Q16X72MM SQ)" → "UB-FH215-F8"
    const code = generateUBoltCode(name)
=======
  // Skip first two rows (headers in row 2)
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i]
    const col1 = toStr(getCell(row, 0))
    const col2 = toStr(getCell(row, 1))

    if (!col1 || !col2) continue

    const name = col1.trim()
    const code = col2.trim()

    if (name.toLowerCase().includes('description') || code.toLowerCase().includes('code')) continue
>>>>>>> 67b50c242752acb2edbf7c42ea15ef3cd4b7f0d6

    out.push({
      source_row: i + 1,
      product_code: code,
      canonical_name: name,
      category: 'manufactured_ubolt',
<<<<<<< HEAD
      product_type: 'u_bolt',
      uom: 'pcs',
      vehicle_make: extractVehicleFromUBoltName(name),
      vehicle_model: null,
      spring_position: name.toUpperCase().startsWith('F/') ? 'Front' : name.toUpperCase().startsWith('R/') ? 'Rear' : null,
      leaf_position: null,
      cost_price: cost,
      selling_price: selling,
=======
      product_type: 'u-bolt',
      uom: 'pcs',
      vehicle_make: null,
      vehicle_model: null,
      spring_position: null,
      leaf_position: null,
      cost_price: null,
      selling_price: null,
>>>>>>> 67b50c242752acb2edbf7c42ea15ef3cd4b7f0d6
    })
  }

  return out
}

<<<<<<< HEAD
function generateUBoltCode(name: string): string {
  // Examples we need to handle:
  // "F/UBOLT FH 215 8''(Q16X72MM SQ)" → "UB-FH215-F8"
  // "F/U BOLT 4D 31 5''(Q14X72MM SQ)" → "UB-4D31-F5"
  // "F/UBOLT NQR 6''(Q16X72MM SQ)" → "UB-NQR-F6"
  const upper = name.toUpperCase()
  const prefix = upper.startsWith('F/') ? 'F' : upper.startsWith('R/') ? 'R' : 'X'
  // strip the F/UBOLT or R/UBOLT prefix
  const withoutPrefix = upper.replace(/^[FR]\/U\s*BOLT\s*/, '').trim()
  // Extract the make/model (everything before the size)
  const sizeMatch = withoutPrefix.match(/(\d+)\s*(?:''|"|inch)/)
  const size = sizeMatch?.[1] ?? ''
  const makePart = sizeMatch ? withoutPrefix.slice(0, sizeMatch.index).trim() : withoutPrefix
  const makeClean = makePart.replace(/\s+/g, '')
  return `UB-${makeClean}-${prefix}${size}`.replace(/-+$/, '')
}

function extractVehicleFromUBoltName(name: string): string | null {
  const upper = name.toUpperCase().replace(/^[FR]\/U\s*BOLT\s*/, '').trim()
  const sizeMatch = upper.match(/\d+\s*(?:''|"|inch)/)
  if (sizeMatch) return upper.slice(0, sizeMatch.index).trim()
  return upper.split('(')[0]?.trim() || null
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSER 4 — Consumables stock (Mombasa / Nairobi files)
//
// Sheet names like " CONSUMABLESTOCK IN-OUT-BALANCE", "TRAILER PARTS IN-OUT",
// "BRAKE LININGS IN-OUT", etc.
//
// Layout (data starts row 5):
//   STOCK IN side:    col 0=DATE, col 1=PRODUCT DESC, col 2=QTY, col 3=REF
//   STOCK OUT side:   col 4=DATE, col 5=PRODUCT DESC, col 6=QTY, col 7=REF
//   BALANCE side:     col 8 onwards (formulas — skip)
//
// We emit two rows per data row: one stock-in (qty positive) and one
// stock-out (qty negative), if either side has data.
//
// `branch` is supplied by the caller (it knows which file is which).
=======
// ─────────────────────────────────────────────────────────────────────────────
// PARSER 4 — Consumables stock movements
//
// Multiple sheets ending with "IN-OUT" (e.g. "consumables IN-OUT").
// Each sheet has three side-by-side tables starting at row 5:
//   Left table (cols A-B): stock IN movements
//   Middle table (cols C-D): stock OUT movements
//   Right table (cols E-F): current balance (ignored for import)
//
// We emit one ParsedStockRow per product movement.
>>>>>>> 67b50c242752acb2edbf7c42ea15ef3cd4b7f0d6
// ─────────────────────────────────────────────────────────────────────────────

export function parseConsumablesStock(
  buffer: ArrayBuffer,
  sheetName: string,
  branch: Branch
): ParsedStockRow[] {
  const { rows } = readSheetAsRows(buffer, sheetName)
  const out: ParsedStockRow[] = []

<<<<<<< HEAD
  // Data starts at row 5 (index 4)
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i]

    // Stock IN side
    const inProduct = toStr(getCell(row, 1))
    const inQty = toNumber(getCell(row, 2))
    if (inProduct && inQty !== null && inQty > 0) {
      out.push({
        source_row: i + 1,
        movement_date: toDate(getCell(row, 0)),
        raw_product_name: inProduct,
        branch,
        qty: Math.round(inQty),
        direction: 'in',
        reference: toStr(getCell(row, 3)),
        notes: null,
      })
    }

    // Stock OUT side
    const outProduct = toStr(getCell(row, 5))
    const outQty = toNumber(getCell(row, 6))
    if (outProduct && outQty !== null && outQty > 0) {
      out.push({
        source_row: i + 1,
        movement_date: toDate(getCell(row, 4)),
        raw_product_name: outProduct,
        branch,
        qty: Math.round(outQty),
        direction: 'out',
        reference: toStr(getCell(row, 7)),
        notes: null,
=======
  // Start from row 5 (index 4)
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i]

    // Left side: stock IN (cols A-B)
    const inProduct = toStr(getCell(row, 0))
    const inQty = toNumber(getCell(row, 1))
    if (inProduct && inQty && inQty > 0) {
      out.push({
        source_row: i + 1,
        movement_date: null, // consumables imports don't have dates
        raw_product_name: inProduct,
        branch,
        qty: inQty,
        direction: 'in',
        reference: `${sheetName} import`,
        notes: `Stock in from ${sheetName}`,
      })
    }

    // Right side: stock OUT (cols C-D)
    const outProduct = toStr(getCell(row, 2))
    const outQty = toNumber(getCell(row, 3))
    if (outProduct && outQty && outQty > 0) {
      out.push({
        source_row: i + 1,
        movement_date: null,
        raw_product_name: outProduct,
        branch,
        qty: outQty,
        direction: 'out',
        reference: `${sheetName} import`,
        notes: `Stock out from ${sheetName}`,
>>>>>>> 67b50c242752acb2edbf7c42ea15ef3cd4b7f0d6
      })
    }
  }

  return out
<<<<<<< HEAD
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE DETECTION
// Inspect a file's sheets and headers to suggest what kind of file it is.
// ─────────────────────────────────────────────────────────────────────────────

export type FileDetection = {
  recommendedSheetType: SpecializedSheetType
  sheetNames: string[]
  reason: string
}

export type SpecializedSheetType =
  | 'sales_quickbooks_v2'  // QuickBooks accordion export
  | 'springs_master'        // SPRINGS LIST sheet → Product master
  | 'ubolt_master'          // U BOLT LIST sheet → Product master
  | 'consumables_stock'     // Mombasa/Nairobi stock files
  | 'unknown'

export async function detectFile(file: File): Promise<FileDetection> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetNames = wb.SheetNames

  // Hint 1: Springs master sheet — multi-sheet file containing "SPRINGS LIST"
  if (sheetNames.includes('SPRINGS LIST')) {
    return {
      recommendedSheetType: 'springs_master',
      sheetNames,
      reason: 'Found SPRINGS LIST sheet — this looks like the springs master catalogue',
    }
  }

  // Hint 2: U-bolt master
  if (sheetNames.includes('U BOLT LIST')) {
    return {
      recommendedSheetType: 'ubolt_master',
      sheetNames,
      reason: 'Found U BOLT LIST sheet — this is the U-bolt master catalogue',
    }
  }

  // Hint 3: Consumables stock — has "IN-OUT" sheets
  if (sheetNames.some((s) => s.toUpperCase().includes('IN-OUT'))) {
    return {
      recommendedSheetType: 'consumables_stock',
      sheetNames,
      reason: 'Found "IN-OUT" sheets — this is a branch consumables stock file',
    }
  }

  // Hint 4: QuickBooks export — single sheet, check for the row-1 pattern
  if (sheetNames.length === 1) {
    const ws = wb.Sheets[sheetNames[0]]
    const firstRow = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      range: 0,
      blankrows: false,
    })[0]
    if (firstRow && Array.isArray(firstRow)) {
      // Check if "Type" and "Memo" appear in the expected scattered columns
      const hasQbStructure =
        toStr(firstRow[7]) === 'Type' &&
        toStr(firstRow[13]) === 'Memo'
      if (hasQbStructure) {
        return {
          recommendedSheetType: 'sales_quickbooks_v2',
          sheetNames,
          reason: 'Detected QuickBooks sales export format',
        }
      }
    }
  }

  return {
    recommendedSheetType: 'unknown',
    sheetNames,
    reason: 'Could not auto-detect format — pick the closest match manually',
  }
=======
>>>>>>> 67b50c242752acb2edbf7c42ea15ef3cd4b7f0d6
}