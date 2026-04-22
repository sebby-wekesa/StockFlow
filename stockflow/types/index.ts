import { Decimal } from '@prisma/client/runtime/library'

export interface Design {
  id: string
  name: string
  code: string
  description?: string
  targetDimensions?: string
  targetWeight: Decimal | null
  kgPerUnit: number
  createdAt: Date
  updatedAt: Date
}