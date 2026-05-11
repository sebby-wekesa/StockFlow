'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createServerSupabase } from '@/lib/supabase/server'
import type { Branch } from '@prisma/client'

async function requireUser() {
  const supabase = await createServerSupabase()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) throw new Error('Not authenticated')
  const user = await prisma.user.findUnique({ where: { id: authUser.id } })
  if (!user) throw new Error('User not provisioned')
  return user
}

async function requireBranchAccess(branch: Branch) {
  const user = await requireUser()
  if (user.role !== 'admin') {
    throw new Error(`You don't have access to ${branch}`)
  }
  return user
}

// ─────────────────────────────────────────────────────────────────────────────
// STOCK TRANSFER — move qty between branches
// ─────────────────────────────────────────────────────────────────────────────

const transferSchema = z.object({
  product_id: z.string().min(1),
  source_branch: z.enum(['mombasa', 'nairobi', 'bonje']),
  dest_branch: z.enum(['mombasa', 'nairobi', 'bonje']),
  qty: z.coerce.number().int().positive(),
  notes: z.string().max(500).optional().nullable(),
})

export async function dispatchTransfer(formData: FormData) {
  const raw = {
    product_id: formData.get('product_id'),
    source_branch: formData.get('source_branch'),
    dest_branch: formData.get('dest_branch'),
    qty: formData.get('qty'),
    notes: formData.get('notes') || null,
  }

  const parsed = transferSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message)
  }

  const data = parsed.data
  if (data.source_branch === data.dest_branch) {
    throw new Error('Source and destination branches must be different')
  }

  const user = await requireUser()

  // Check that source has enough stock
  const sourceStock = await prisma.product.findUnique({
    where: {
      id: data.product_id,
    },
  })
  if (!sourceStock || sourceStock.currentStock < data.qty) {
    throw new Error(
      `Insufficient stock: have ${sourceStock?.currentStock ?? 0}, need ${data.qty}`
    )
  }

  // Transfer in a transaction
  await prisma.$transaction(async (tx) => {
    // 1. Decrement stock (global)
    await tx.product.update({
      where: {
        id: data.product_id,
      },
      data: { currentStock: { decrement: data.qty } },
    })

    // 2. Log the transfer (no increment since global stock)

    // 3. Record stock movements
    await tx.StockMovement.create({
      data: {
        product_id: data.product_id,
        movement_type: 'transfer_out',
        branch: data.source_branch,
        qty: -data.qty,
        reference: `TRANSFER-${Date.now()}`,
        movement_date: new Date(),
        notes: data.notes,
        created_by: user.id,
      },
    })

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'STOCK_TRANSFER',
        entityType: 'Product',
        entityId: data.product_id,
        details: `Transferred ${data.qty} from ${data.source_branch} to ${data.dest_branch}. Notes: ${data.notes}`,
      },
    })
  })

  revalidatePath('/stock')
  revalidatePath('/stock/transfer')
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH PRODUCTS WITH STOCK — for transfer picker
// ─────────────────────────────────────────────────────────────────────────────

export async function searchProductsWithStock(query: string, branch: Branch) {
  await requireUser()
  if (!query || query.length < 2) return []

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { sku: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: 10,
    orderBy: { sku: 'asc' },
  })

  return products.map((p) => ({
    id: p.id,
    product_code: p.sku,
    canonical_name: p.name,
    uom: p.uom,
    stock_at_branch: p.currentStock,
  }))
}