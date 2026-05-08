import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabase } from '@/lib/supabase/server'
import { getDateRange, toCSV, type DateRangeKey } from '@/lib/reports'

export async function GET(request: Request) {
  // Auth check
  const supabase = createServerSupabase()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  const user = await prisma.User.findUnique({ where: { id: authUser.id } })
  if (!user || !['admin', 'manager', 'accountant'].includes(user.role)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const range = (searchParams.get('range') as DateRangeKey) || '30d'
  const { start, end } = getDateRange(range)

  const orders = await prisma.salesOrder.findMany({
    where: {
      status: { in: ['INVOICED', 'FULFILLED'] },
      ...(start ? { invoice_date: { gte: start, lte: end } } : {}),
    },
    orderBy: { invoice_date: 'desc' },
    include: {
      lines: { include: { product: { select: { product_code: true } } } },
      created_by_user: { select: { name: true } },
    },
  })

  // Flatten to one row per line item
  const rows = orders.flatMap((order) =>
    order.lines.map((line) => ({
      invoice_date: new Date(order.invoice_date).toISOString().slice(0, 10),
      invoice_number: order.order_number,
      branch: order.branch,
      customer: order.customer_name,
      product_code: line.product.product_code,
      product_name: line.product_name,
      qty: line.qty,
      uom: line.uom,
      unit_price: Number(line.unit_price),
      total: Number(line.total_amount),
      notes: line.notes ?? '',
      recorded_by: order.created_by_user.name,
    }))
  )

  const csv = toCSV(rows, [
    { key: 'invoice_date', label: 'Invoice date' },
    { key: 'invoice_number', label: 'Invoice number' },
    { key: 'branch', label: 'Branch' },
    { key: 'customer', label: 'Customer' },
    { key: 'product_code', label: 'Product code' },
    { key: 'product_name', label: 'Product name' },
    { key: 'qty', label: 'Quantity' },
    { key: 'uom', label: 'UOM' },
    { key: 'unit_price', label: 'Unit price' },
    { key: 'total', label: 'Total amount' },
    { key: 'notes', label: 'Notes' },
    { key: 'recorded_by', label: 'Recorded by' },
  ])

  const today = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sales-${range}-${today}.csv"`,
    },
  })
}