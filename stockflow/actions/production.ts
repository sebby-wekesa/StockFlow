'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createServerSupabase } from '@/lib/supabase/server'
import { getStagesForCategory } from '@/lib/production'
import type { ProductCategory } from '@prisma/client'

async function requireUser() {
  const supabase = await createServerSupabase()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) throw new Error('Not authenticated')
  const user = await prisma.user.findUnique({ where: { id: authUser.id } })
  if (!user) throw new Error('User not provisioned')
  return user
}

async function requireProductionAccess() {
  const user = await requireUser()
  if (!['admin', 'manager', 'warehouse'].includes(user.role)) {
    throw new Error('Only admins, managers, and warehouse staff can manage production')
  }
  return user
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE JOB CARD
// ─────────────────────────────────────────────────────────────────────────────

const createJobSchema = z.object({
  designId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  notes: z.string().max(500).optional().nullable(),
  // Optional raw material issuance
  rawMaterialId: z.string().optional().nullable(),
  qtyBars: z.coerce.number().int().positive().optional().nullable(),
  qtyKg: z.coerce.number().positive().optional().nullable(),
})

export async function createJobCard(formData: FormData) {
  const user = await requireProductionAccess()

  const raw = {
    designId: formData.get('designId'),
    quantity: formData.get('quantity'),
    notes: formData.get('notes') || null,
    rawMaterialId: formData.get('rawMaterialId') || null,
    qtyBars: formData.get('qtyBars') || null,
    qtyKg: formData.get('qtyKg') || null,
  }
  const parsed = createJobSchema.safeParse(raw)
  if (!parsed.success) throw new Error(parsed.error.issues[0].message)
  const data = parsed.data

  // Get the design to determine stages
  const design = await prisma.design.findUnique({
    where: { id: data.designId },
  })
  if (!design) throw new Error('Design not found')

  // Validate that the design has production stages
  if (!design.stages || design.stages.length === 0) {
    throw new Error('Design must have production stages defined')
  }

  // Validate raw material if provided
  let rmBalance = null
  if (data.rawMaterialId) {
    rmBalance = await prisma.rawMaterialBalance.findUnique({
      where: { raw_material_id: data.rawMaterialId },
    })
    if (!rmBalance || rmBalance.qty_bars < (data.qty_bars || 0) || rmBalance.qty_kg < (data.qty_kg || 0)) {
      throw new Error('Insufficient raw material stock')
    }
  }

  const stages = getStagesForCategory(product.category as ProductCategory)

  await prisma.$transaction(async (tx) => {
    // Create job card
    const job = await tx.productionOrder.create({
      data: {
        product_id: data.product_id,
        qty_ordered: data.qty_ordered,
        notes: data.notes,
        status: 'open',
        created_by: user.id,
      },
    })

    // Create stages
    for (const stage of stages) {
      await tx.productionOrderStage.create({
        data: {
          job_card_id: job.id,
          stage_number: stage.number,
          stage_name: stage.label,
          qty_in: stage.number === 1 ? data.qty_ordered : 0, // First stage gets the full quantity
        },
      })
    }

    // Issue raw material if provided
    if (data.rawMaterialId && data.qtyBars && data.qtyKg) {
      await tx.productionOrderRawMaterial.create({
        data: {
          job_card_id: job.id,
          raw_material_id: data.rawMaterialId,
          qty_bars: data.qtyBars,
          qty_kg: data.qtyKg,
        },
      })

      // Decrement RM balance
      await tx.rawMaterialMovement.create({
        data: {
          raw_material_id: data.rawMaterialId,
          movement_type: 'production_issue',
          qty_bars: -data.qtyBars,
          qty_kg: -data.qtyKg,
          reference: `Job ${job.id}`,
          notes: `Issued for job card ${job.id}`,
          movement_date: new Date(),
          created_by: user.id,
        },
      })

      await tx.rawMaterialBalance.update({
        where: { raw_material_id: data.rawMaterialId },
        data: {
          qty_bars: { decrement: data.qtyBars },
          qty_kg: { decrement: data.qtyKg },
        },
      })
    }
  })

  revalidatePath('/jobs')
  redirect(`/jobs/${jobId}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETE STAGE
// ─────────────────────────────────────────────────────────────────────────────

const completeStageSchema = z.object({
  stage_id: z.string().min(1),
  qty_out: z.coerce.number().int().min(0),
  qty_rejected: z.coerce.number().int().min(0),
  notes: z.string().max(500).optional().nullable(),
})

export async function completeStage(formData: FormData) {
  const user = await requireProductionAccess()

  const raw = {
    stage_id: formData.get('stage_id'),
    qty_out: formData.get('qty_out'),
    qty_rejected: formData.get('qty_rejected'),
    notes: formData.get('notes') || null,
  }
  const parsed = completeStageSchema.safeParse(raw)
  if (!parsed.success) throw new Error(parsed.error.issues[0].message)
  const data = parsed.data

  const stage = await prisma.productionOrderStage.findUnique({
    where: { id: data.stage_id },
    include: { job_card: true },
  })
  if (!stage) throw new Error('Stage not found')
  if (stage.completed_at) throw new Error('Stage already completed')

  const totalAccounted = data.qty_out + data.qty_rejected
  if (totalAccounted !== stage.qty_in) {
    throw new Error(`Quantity mismatch: ${totalAccounted} accounted vs ${stage.qty_in} input`)
  }

  await prisma.$transaction(async (tx) => {
    // Complete current stage
    await tx.productionOrderStage.update({
      where: { id: data.stage_id },
      data: {
        qty_out: data.qty_out,
        qty_rejected: data.qty_rejected,
        completed_at: new Date(),
        notes: data.notes,
        completed_by: user.id,
      },
    })

    // Update job status
    const job = await tx.productionOrder.findUnique({
      where: { id: stage.job_card_id },
      include: { stages: true },
    })
    if (!job) throw new Error('Job not found')

    const allStages = job.stages
    const completedStages = allStages.filter((s) => s.completed_at)
    const isFirstCompletion = completedStages.length === 1

    if (isFirstCompletion) {
      // First completion - set to in_progress
      await tx.productionOrder.update({
        where: { id: stage.job_card_id },
        data: { status: 'in_progress' },
      })
    }

    // If this was the last stage, complete the job
    const stages = getStagesForCategory(job.product.category as ProductCategory)
    if (stage.stage_number === stages.length) {
      await tx.productionOrder.update({
        where: { id: stage.job_card_id },
        data: {
          status: 'complete',
          qty_produced: data.qty_out,
        },
      })

      // Increment finished goods stock
      await tx.inventoryFinishedGoods.upsert({
        where: {
          branchId_finishedGoodsId: {
            branchId: 'mombasa', // Production happens at Mombasa
            finishedGoodsId: job.finishedGoodsId,
          },
        },
        update: { availableQty: { increment: data.qty_out } },
        create: {
          branchId: 'mombasa',
          finishedGoodsId: job.finishedGoodsId,
          availableQty: data.qty_out,
        },
      })

      // Create stock movement
      await tx.stockMovement.create({
        data: {
          product_id: job.product_id,
          branch: 'mombasa',
          movement_type: 'production_output',
          qty: data.qty_out,
          reference: `Job ${job.id}`,
          notes: `Production completed for job ${job.id}`,
          created_by: user.id,
        },
      })
    } else {
      // Set next stage qty_in
      const nextStage = allStages.find((s) => s.stage_number === stage.stage_number + 1)
      if (nextStage) {
        await tx.productionOrderStage.update({
          where: { id: nextStage.id },
          data: {
            qty_in: data.qty_out,
            started_at: new Date(),
          },
        })
      }
    }
  })

  revalidatePath(`/jobs/${stage.job_card_id}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL JOB
// ─────────────────────────────────────────────────────────────────────────────

export async function cancelJob(jobId: string, reason: string) {
  const user = await requireProductionAccess()

  if (!reason || reason.length < 3) {
    throw new Error('Cancellation reason must be at least 3 characters')
  }

  const job = await prisma.productionOrder.findUnique({
    where: { id: jobId },
    include: { raw_materials: true },
  })
  if (!job) throw new Error('Job not found')
  if (job.status === 'complete') throw new Error('Cannot cancel completed job')

  await prisma.$transaction(async (tx) => {
    // Cancel job
    await tx.productionOrder.update({
      where: { id: jobId },
      data: {
        status: 'cancelled',
        notes: (job.notes || '') + `\n\nCANCELLED: ${reason}`,
      },
    })

    // Return issued raw materials
    for (const rm of job.raw_materials) {
      await tx.rawMaterialMovement.create({
        data: {
          raw_material_id: rm.raw_material_id,
          movement_type: 'adjustment_in',
          qty_bars: rm.qty_bars,
          qty_kg: rm.qty_kg,
          reference: `Job ${jobId} cancelled`,
          notes: reason,
          movement_date: new Date(),
          created_by: user.id,
        },
      })

      await tx.rawMaterialBalance.update({
        where: { raw_material_id: rm.raw_material_id },
        data: {
          qty_bars: { increment: rm.qty_bars },
          qty_kg: { increment: rm.qty_kg },
        },
      })
    }
  })

  revalidatePath(`/jobs/${jobId}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH MANUFACTURED PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

export async function searchManufacturedProducts(query: string) {
  await requireUser()
  if (!query || query.length < 1) {
    // Return all manufactured products
    return prisma.product.findMany({
      where: {

        category: { in: ['manufactured_spring', 'manufactured_ubolt'] },
      },
      orderBy: { product_code: 'asc' },
      take: 20,
    })
  }

  return prisma.product.findMany({
    where: {
      is_active: true,
      category: { in: ['manufactured_spring', 'manufactured_ubolt'] },
      OR: [
        { product_code: { contains: query, mode: 'insensitive' } },
        { canonical_name: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { product_code: 'asc' },
    take: 10,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// GET ORDER FOR LOGGING
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrderForLogging(orderId: string) {
  const user = await requireUser()

  const order = await prisma.productionOrder.findUnique({
    where: { id: orderId },
    include: {
      product: true,
      stages: {
        orderBy: { sequence: 'asc' },
        include: {
          stage: true,
          logs: {
            orderBy: { completedAt: 'desc' },
            take: 1,
          },
        },
      },
      consumptionLogs: true,
    },
  })

  if (!order) throw new Error('Order not found')

  // Check if user can access this order's branch
  const userBranchIds = (user.branches ?? []).map(b => b.id);
  if (!userBranchIds.includes(order.branch.id)) {
    throw new Error('Access denied')
  }

  // Calculate inherited kg for each stage
  const stagesWithInherited = order.stages.map((stage, index) => {
    let inheritedKg = 0
    if (index === 0) {
      // First stage inherits from raw material input
      const totalConsumption = order.consumptionLogs.reduce((sum, log) => sum + Number(log.quantityConsumed), 0)
      inheritedKg = totalConsumption
    } else {
      // Subsequent stages inherit from previous stage output
      const prevStage = order.stages[index - 1]
      const prevOutput = prevStage.logs[0]?.kgOut || 0
      inheritedKg = prevOutput
    }

    return {
      ...stage,
      inheritedKg,
    }
  })

  return {
    ...order,
    stages: stagesWithInherited,
  }
}