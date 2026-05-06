import type { Branch } from '@prisma/client'

export const BRANCH_LABELS: Record<Branch, string> = {
  mombasa: 'Mombasa HQ',
  nairobi: 'Nairobi',
  bonje: 'Bonje',
}

export const BRANCH_SUB: Record<Branch, string> = {
  mombasa: 'Production + main store',
  nairobi: 'Retail branch',
  bonje: 'Retail branch',
}

// Border accent colors per branch — these are 3px top borders on cards
export const BRANCH_ACCENT_CLASS: Record<Branch, string> = {
  mombasa: 'before:bg-accent',
  nairobi: 'before:bg-teal',
  bonje: 'before:bg-purple',
}

export const BRANCH_TEXT_CLASS: Record<Branch, string> = {
  mombasa: 'text-accent',
  nairobi: 'text-teal',
  bonje: 'text-purple',
}

export const ALL_BRANCHES: Branch[] = ['mombasa', 'nairobi', 'bonje']

// KES formatter — used everywhere stock value is shown
export function formatKES(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return amount.toLocaleString('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}