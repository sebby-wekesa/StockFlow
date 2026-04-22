import { Decimal } from '@prisma/client/runtime/library'

export interface Design {
  id: string
  name: string
  targetWeight: Decimal | null
  kgPerUnit: number
}