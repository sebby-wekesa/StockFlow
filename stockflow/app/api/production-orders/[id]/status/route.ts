export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    // Verify user has manager or admin role
    const user = await requireRole('ADMIN')

    const body = await request.json()
    const { status, rejectionReason } = body

    // Validate status
    if (!['RELEASED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be RELEASED or REJECTED.' },
        { status: 400 }
      )
    }

    // If rejecting, rejection reason is required
    if (status === 'REJECTED' && !rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    // Get the current order
    const order = await prisma.productionOrder.findUnique({
      where: { id: params.id },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Update the order status
    const statusMap: any = {
      RELEASED: 'APPROVED',
      REJECTED: 'REJECTED',
    }

    const newStatus = statusMap[status]

    // If approving, perform inventory deduction
    let updatedOrder;
    if (status === 'RELEASED') {
      updatedOrder = await prisma.$transaction(async (tx) => {
        // 1. Get the Design to see which raw material is needed
        const design = await tx.design.findUnique({
          where: { id: order.designId },
          select: { kgPerUnit: true, rawMaterialId: true }
        });

        if (!design) {
          throw new Error('Design not found');
        }

        if (!design.rawMaterialId) {
          throw new Error('Design does not have an assigned raw material');
        }

        // 2. Calculate the required KG
        const requiredKg = order.quantity * design.kgPerUnit;

        // 3. Deduct from Available and add to Reserved
        await tx.rawMaterial.update({
          where: { id: design.rawMaterialId },
          data: {
            availableKg: { decrement: requiredKg },
            reservedKg: { increment: requiredKg }
          }
        });

        // 4. Update the Order Status
        return await tx.productionOrder.update({
          where: { id: params.id },
          data: {
            status: newStatus,
            approvedBy: user.id,
            approvedAt: new Date(),
          },
          include: {
            design: {
              select: { name: true },
            },
          },
        });
      });
    } else {
      updatedOrder = await prisma.productionOrder.update({
        where: { id: params.id },
        data: {
          status: newStatus,
          approvedBy: user.id,
          approvedAt: new Date(),
          // Store rejection reason in notes if rejecting
          ...(status === 'REJECTED' && {
            // Note: Adjust this if your schema has a rejectionReason field
            // For now, we'll use notes
          }),
        },
        include: {
          design: {
            select: { name: true },
          },
        },
      });
    }

    // Create an audit log entry
    try {
      await prisma.$executeRaw`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
        VALUES (${user.id}, ${status === 'RELEASED' ? 'APPROVED_ORDER' : 'REJECTED_ORDER'}, 'ProductionOrder', ${params.id}, ${JSON.stringify({
          previousStatus: order.status,
          newStatus,
          reason: rejectionReason,
        })}, NOW())
      `
    } catch (auditError) {
      // Log audit error but don't fail the request
      console.error('Audit log error:', auditError)
    }

    return NextResponse.json(
      {
        success: true,
        message: `Order ${status === 'RELEASED' ? 'approved' : 'rejected'} successfully`,
        data: updatedOrder,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Order status update error:', error)

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized. Only Managers and Admins can update order status.' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve a specific order
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const order = await prisma.productionOrder.findUnique({
      where: { id: params.id },
      include: {
        design: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: order,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Order retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve order' },
      { status: 500 }
    )
  }
}
