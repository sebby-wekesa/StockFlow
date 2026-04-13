import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderNumber, designId, initialWeight, priority } = body

    // Validate required fields
    if (!orderNumber || !designId || !initialWeight || !priority) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate priority enum
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority value' },
        { status: 400 }
      )
    }

    // Validate weight
    if (initialWeight <= 0 || initialWeight > 10000) {
      return NextResponse.json(
        { error: 'Invalid weight value' },
        { status: 400 }
      )
    }

    // Check if design exists
    const design = await prisma.design.findUnique({
      where: { id: designId },
    })

    if (!design) {
      return NextResponse.json(
        { error: 'Design not found' },
        { status: 404 }
      )
    }

    // Create production order
    const productionOrder = await prisma.productionOrder.create({
      data: {
        designId,
        quantity: 1,
        targetKg: initialWeight,
        status: 'PENDING',
        priority,
      },
      include: {
        design: true,
      },
    })

    return NextResponse.json(
      {
        message: 'Production order created successfully',
        order: productionOrder,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating production order:', error)
    return NextResponse.json(
      { error: 'Failed to create production order' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const orders = await prisma.productionOrder.findMany({
      include: { design: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching production orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch production orders' },
      { status: 500 }
    )
  }
}
