import type { Branch, SalesOrderStatus } from '@prisma/client'

export const STATUS_LABELS: Record<SalesOrderStatus, string> = {
  draft: 'Draft',
  confirmed: 'Confirmed',
  invoiced: 'Invoiced',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
}

export const STATUS_BADGE_CLASS: Record<SalesOrderStatus, string> = {
  draft: 'bg-surface2 text-muted',
  confirmed: 'bg-purple/15 text-purple',
  invoiced: 'bg-accent/15 text-accent',
  fulfilled: 'bg-teal/15 text-teal',
  cancelled: 'bg-red/15 text-red',
}

export function formatKES(amount: number): string {
  return amount.toLocaleString('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}