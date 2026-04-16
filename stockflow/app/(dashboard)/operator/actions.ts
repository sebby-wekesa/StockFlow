'use server'

import { prisma } from '@/lib/prisma'

/**
 * Fetches designs (items) for the operator dashboard.
 * Map 'item' from instructions to the 'Design' model.
 */
export async function getOperatorData() {
  try {
    const data = await prisma.design.findMany()
    return { success: true, data }
  } catch (error) {
    console.error("Operator Data Fetch Error:", error)
    return { success: false, error: "Failed to fetch data" }
  }
}
