import type { Branch, SalesOrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
export { STATUS_LABELS, STATUS_BADGE_CLASS, formatKES } from './sales-utils'

// Branch invoice prefixes — matches existing Springtech numbering convention
const INVOICE_PREFIX: Record<Branch, string> = {
  mombasa: '',        // Mombasa uses pure numeric: 107372
  nairobi: 'NBI',     // NBI25228
  bonje: 'BNJ',       // BNJ633
}

/**
 * Generate the next invoice number for a branch. Reads the highest existing
 * number with that prefix and increments. Falls back to 1000 (Mombasa) or
 * 1 (branches) if none exists.
 */
export async function nextInvoiceNumber(branch: Branch): Promise<string> {
  const prefix = INVOICE_PREFIX[branch]

  const existing = await prisma.salesOrder.findMany({
    where: branch === 'mombasa'
      ? { branch }                                      // mombasa: any number
      : { order_number: { startsWith: prefix } },       // others: must have prefix
    select: { order_number: true },
    orderBy: { created_at: 'desc' },
    take: 200, // scan recent invoices to find the max
  })

  let maxNum = 0
  for (const e of existing) {
    const numPart = prefix
      ? e.order_number.replace(prefix, '')
      : e.order_number
    const parsed = parseInt(numPart.replace(/\D/g, ''), 10)
    if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed
  }

  const next = maxNum > 0 ? maxNum + 1 : (branch === 'mombasa' ? 100000 : 1)
  return `${prefix}${next}`
}

