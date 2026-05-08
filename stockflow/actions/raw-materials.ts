'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createServerSupabase } from '@/lib/supabase/server'

async function requireUser() {
  const supabase = createServerSupabase()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) throw new Error('Not authenticated')
  const user = await prisma.public.User.findUnique({ where: { id: authUser.id } })
  if (!user) throw new Error('User not provisioned')
  return user
}

async function requireWarehouseAccess() {
  const user = await requireUser()
  if (!['admin', 'manager', 'warehouse'].includes(user.role)) {
    throw new Error('Only admins, managers, and warehouse staff can manage raw materials')
  }
  return user
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE RAW MATERIAL TYPE
// e.g. "70x10mm flat bar, 228 inch lengths"
// ─────────────────────────────────────────────────────────────────────────────

const createRMSchema = z.object({
  material_type: z.enum(['flat_bar', 'round_bar']),
  width_mm: z.coerce.number().int().positive().optional().nullable(),
  thickness_mm: z.coerce.number().int().positive().optional().nullable(),
  diameter_mm: z.coerce.number().int().positive().optional().nullable(),
  length_inches: z.coerce.number().int().positive(),
})

export async function createRawMaterial(formData: FormData) {
  await requireWarehouseAccess()

  const raw = {
    material_type: formData.get('material_type'),
    width_mm: formData.get('width_mm') || null,
    thickness_mm: formData.get('thickness_mm') || null,
    diameter_mm: formData.get('diameter_mm') || null,
    length_inches: formData.get('length_inches'),
  }
  const parsed = createRMSchema.safeParse(raw)
  if (!parsed.success) throw new Error(parsed.error.issues[0].message)
  const data = parsed.data

  // Build the code based on type
  let code: string
  let label: string
  if (data.material_type === 'flat_bar') {
    if (!data.width_mm || !data.thickness_mm) {
      throw new Error('Width and thickness required for flat bars')
    }
    code = `${data.width_mm}X${data.thickness_mm}-${data.length_inches}`
    label = `Flat Bar ${data.width_mm}×${data.thickness_mm}mm, ${data.length_inches}"`
  } else {
    if (!data.diameter_mm) {
      throw new Error('Diameter required for round bars')
    }
    code = `Q${data.diameter_mm}X${data.length_inches}`
    label = `Round Bar Ø${data.diameter_mm}mm, ${data.length_inches}"`
  }

  const existing = await prisma.rawMaterial.findUnique({ where: { code } })
  if (existing) throw new Error(`Raw material "${code}" already exists`)

  const rm = await prisma.rawMaterial.create({
    data: {
      org_id: (await requireUser()).org_id,
      material_type: data.material_type,
      code,
      label,
      width_mm: data.width_mm,
      thickness_mm: data.thickness_mm,
      diameter_mm: data.diameter_mm,
      length_inches: data.length_inches,
    },
  })

  await prisma.rawMaterialBalance.create({
    data: { raw_material_id: rm.id, qty_bars: 0, qty_kg: 0 },
  })

  revalidatePath('/raw-materials')
  redirect(`/raw-materials/${rm.id}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// RECEIVE BARS — supplier delivery
// ─────────────────────────────────────────────────────────────────────────────

const receiveSchema = z.object({
  raw_material_id: z.string().min(1),
  qty_bars: z.coerce.number().int().positive(),
  qty_kg: z.coerce.number().positive(),
  supplier_name: z.string().max(200).optional().nullable(),
  reference: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

export async function receiveRawMaterial(formData: FormData) {
  const user = await requireWarehouseAccess()

  const raw = {
    raw_material_id: formData.get('raw_material_id'),
    qty_bars: formData.get('qty_bars'),
    qty_kg: formData.get('qty_kg'),
    supplier_name: formData.get('supplier_name') || null,
    reference: formData.get('reference') || null,
    notes: formData.get('notes') || null,
  }
  const parsed = receiveSchema.safeParse(raw)
  if (!parsed.success) throw new Error(parsed.error.issues[0].message)
  const data = parsed.data

  await prisma.$transaction(async (tx) => {
    await tx.rawMaterialMovement.create({
      data: {
        raw_material_id: data.raw_material_id,
        movement_type: 'purchase_receipt',
        qty_bars: data.qty_bars,
        qty_kg: data.qty_kg,
        reference: data.reference,
        supplier_name: data.supplier_name,
        notes: data.notes,
        movement_date: new Date(),
        created_by: user.id,
      },
    })

    await tx.rawMaterialBalance.upsert({
      where: { raw_material_id: data.raw_material_id },
      update: {
        qty_bars: { increment: data.qty_bars },
        qty_kg: { increment: data.qty_kg },
      },
      create: {
        raw_material_id: data.raw_material_id,
        qty_bars: data.qty_bars,
        qty_kg: data.qty_kg,
      },
    })
  })

  revalidatePath('/raw-materials')
  revalidatePath(`/raw-materials/${data.raw_material_id}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH — used by the new job card form's RM picker
// ─────────────────────────────────────────────────────────────────────────────

export async function searchRawMaterials(query: string, materialType?: 'flat_bar' | 'round_bar') {
  await requireUser()
  if (!query || query.length < 1) {
    // when no query, return everything with positive balance
    const rms = await prisma.rawMaterial.findMany({
      where: {
        is_active: true,
        ...(materialType ? { material_type: materialType } : {}),
      },
      orderBy: { code: 'asc' },
      take: 20,
    })
    return Promise.all(
      rms.map(async (rm) => ({
        id: rm.id,
        code: rm.code,
        label: rm.label,
        material_type: rm.material_type,
        balance: await prisma.rawMaterialBalance.findUnique({
          where: { raw_material_id: rm.id },
        }),
      }))
    )
  }

  const rms = await prisma.rawMaterial.findMany({
    where: {
      is_active: true,
      ...(materialType ? { material_type: materialType } : {}),
      OR: [
        { code: { contains: query, mode: 'insensitive' } },
        { label: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { code: 'asc' },
    take: 10,
  })

  return Promise.all(
    rms.map(async (rm) => ({
      id: rm.id,
      code: rm.code,
      label: rm.label,
      material_type: rm.material_type,
      balance: await prisma.rawMaterialBalance.findUnique({
        where: { raw_material_id: rm.id },
      }),
    }))
  )
}