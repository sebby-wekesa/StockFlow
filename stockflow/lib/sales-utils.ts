import type { Branch, SalesOrderStatus } from '@prisma/client'

export const STATUS_LABELS: Record<SalesOrderStatus, string> = {
  PENDING: 'Draft',
  CONFIRMED: 'Confirmed',
  INVOICED: 'Invoiced',
  FULFILLED: 'Fulfilled',
  CANCELLED: 'Cancelled',
}

export const STATUS_BADGE_CLASS: Record<SalesOrderStatus, string> = {
  PENDING: 'bg-surface2 text-muted',
  CONFIRMED: 'bg-purple/15 text-purple',
  INVOICED: 'bg-accent/15 text-accent',
  FULFILLED: 'bg-teal/15 text-teal',
  CANCELLED: 'bg-red/15 text-red',
}

export function formatKES(amount: number): string {
  return amount.toLocaleString('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}