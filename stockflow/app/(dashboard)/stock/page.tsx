export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ALL_BRANCHES, BRANCH_LABELS, BRANCH_SUB, formatKES } from '@/lib/branches'
import { CATEGORY_BADGE_CLASS, CATEGORY_SHORT } from '@/lib/products'
import type { Branch, ProductCategory } from '@prisma/client'

const PAGE_SIZE = 50

export default async function BranchStockPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; page?: string }>
}) {
  const params = await searchParams;
  const focusedBranch = params.branch as Branch | undefined
  const page = Math.max(1, Number(params.page ?? 1))

  // Build product filter
  const productWhere: any = {
    currentStock: {
      gt: 0,
    },
  }

   // Fetch all the dashboard data in parallel
   const [products, total, branchSummaries, lowStockCount, allRawStock, allFinishedStock] = await Promise.all([
      prisma.product.findMany({
         where: productWhere,
         orderBy: {
           sku: 'asc',
         },
         take: PAGE_SIZE,
         skip: (page - 1) * PAGE_SIZE,
       }),
     prisma.product.count({ where: productWhere }),
     // Get all raw material stock
     prisma.inventoryRawMaterial.findMany({
       where: { availableKg: { gt: 0 } },
       include: { RawMaterial: { select: { id: true } } }
     }),
     // Get all finished goods stock
     prisma.inventoryFinishedGoods.findMany({
       where: { availableQty: { gt: 0 } },
       include: { FinishedGoods: { select: { id: true } } }
     }),
    Promise.all(
      ALL_BRANCHES.map(async (branch) => {
        const [stockAgg, lowStock] = await Promise.all([
          // For raw materials
          prisma.inventoryRawMaterial.aggregate({
            where: { branchId: branch, availableKg: { gt: 0 } },
            _sum: { availableKg: true },
            _count: { _all: true },
          }),
          // For finished goods
          prisma.inventoryFinishedGoods.aggregate({
            where: { branchId: branch, availableQty: { gt: 0 } },
            _sum: { availableQty: true },
            _count: { _all: true },
          }),
        ])

        // Calculate low stock for both raw materials and finished goods
        const [rawLowStock, finishedLowStock] = await Promise.all([
          prisma.inventoryRawMaterial.count({
            where: {
              branchId: branch,
              availableKg: { gt: 0, lt: 5 },
            },
          }),
          prisma.inventoryFinishedGoods.count({
            where: {
              branchId: branch,
              availableQty: { gt: 0, lt: 5 },
            },
          }),
        ])

        // Compute approximate value: sum(availableKg * unitCost) for raw materials + sum(availableQty * unitCost) for finished goods
        const [valuedRawStock, valuedFinishedStock] = await Promise.all([
          prisma.inventoryRawMaterial.findMany({
            where: { branchId: branch, availableKg: { gt: 0 } },
            include: { RawMaterial: { select: { costPerKg: true } } },
          }),
          prisma.inventoryFinishedGoods.findMany({
            where: { branchId: branch, availableQty: { gt: 0 } },
            include: { FinishedGoods: { select: { unitCost: true } } },
          }),
        ])

        const rawValue = valuedRawStock.reduce(
          (sum, s) => sum + (Number(s.availableKg) * (Number(s.RawMaterial?.costPerKg) || 0)),
          0
        )
        const finishedValue = valuedFinishedStock.reduce(
          (sum, s) => sum + (Number(s.availableQty) * (Number(s.FinishedGoods?.unitCost) || 0)),
          0
        )
        const value = rawValue + finishedValue

        return {
          branch,
          totalUnits: ((stockAgg[0]?._sum.availableKg ?? 0) + (stockAgg[1]?._sum.availableQty ?? 0)),
          totalSkus: ((stockAgg[0]?._count._all ?? 0) + (stockAgg[1]?._count._all ?? 0)),
          value,
          lowStock: (rawLowStock + finishedLowStock),
        }
      })
    ),
    // Low stock count for both raw materials and finished goods
    Promise.all([
      prisma.inventoryRawMaterial.count({ where: { availableKg: { gt: 0, lt: 5 } } }),
      prisma.inventoryFinishedGoods.count({ where: { availableQty: { gt: 0, lt: 5 } } }),
    ]).then(([rawCount, finishedCount]) => rawCount + finishedCount),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Helper function to get stock for a product across branches
  function getStockByBranch(productId: string) {
    const stockByBranch: Record<Branch, number> = {
      mombasa: 0,
      nairobi: 0,
      bonje: 0,
    }

    // Add raw material stock
    allRawStock.forEach(stock => {
      if (stock.RawMaterial.id === productId) {
        stockByBranch[stock.branchId as Branch] = Number(stock.availableKg)
      }
    })

    // Add finished goods stock
    allFinishedStock.forEach(stock => {
      if (stock.FinishedGoods.id === productId) {
        stockByBranch[stock.branchId as Branch] = Number(stock.availableQty)
      }
    })

    return stockByBranch
  }

  function buildHref(overrides: { branch?: string; page?: number }) {
    const params = new URLSearchParams()
    const _branch = overrides.branch ?? focusedBranch
    const _page = overrides.page ?? page
    if (_branch) params.set('branch', _branch)
    if (_page > 1) params.set('page', String(_page))
    const qs = params.toString()
    return qs ? `/stock?${qs}` : '/stock'
  }

  return (
    <div>
      <div className="section-header mb-16">
        <div>
          <div className="section-title">Branch Stock</div>
          <div className="section-sub">
            Live inventory across all three branches · {lowStockCount} items below reorder point
          </div>
        </div>
        <Link href="/stock/transfer" className="btn btn-primary">
          Transfer Stock
        </Link>
      </div>

      {/* BRANCH SUMMARY CARDS */}
      <div className="section-header mb-8">
        <div className="section-title">Branch Overview</div>
        <div className="section-sub">Click any branch to filter the product table below</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {branchSummaries.map(({ branch, totalUnits, totalSkus, value, lowStock }) => {
          const isFocused = focusedBranch === branch
          return (
            <Link
              key={branch}
              href={
                isFocused
                  ? buildHref({ branch: '', page: 1 })
                  : buildHref({ branch, page: 1 })
              }
              className={`card transition-all ${
                isFocused
                  ? 'ring-2 ring-accent-amber border-accent-amber'
                  : 'hover:border-accent-amber/50'
              }`}
            >
              <div className="p-6">
                <div className="section-title mb-2">{BRANCH_LABELS[branch]}</div>
                <div className="text-muted text-sm mb-4">{BRANCH_SUB[branch]}</div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted text-sm">SKUs in stock</span>
                    <span className="font-mono font-medium">{totalSkus}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted text-sm">Total units</span>
                    <span className="font-mono font-medium">{totalUnits.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted text-sm">Stock value</span>
                    <span className="font-mono font-medium">{formatKES(value)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted text-sm">Low stock alerts</span>
                    <span
                      className={`font-mono font-medium ${
                        lowStock > 0 ? 'text-red' : 'text-muted'
                      }`}
                    >
                      {lowStock}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>





      {/* PRODUCT TABLE */}
      <div className="section-header mb-8">
        <div className="section-title">
          {focusedBranch ? `${BRANCH_LABELS[focusedBranch]} Products` : 'All Products'}
        </div>
        <div className="section-sub">
          {focusedBranch ? `Showing products available at ${BRANCH_LABELS[focusedBranch]}` : 'Products with stock across all branches'}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th className="text-right">Mombasa</th>
                <th className="text-right">Nairobi</th>
                <th className="text-right">Bonje</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted text-sm">
                    No products found.
                  </td>
                </tr>
              ) : (
                 products.map((p) => {
                    const stockByBranch = getStockByBranch(p.id)
                    const totalStock = Object.values(stockByBranch).reduce((sum, qty) => sum + qty, 0)

                    return (
                      <tr key={p.id}>
                        <td>
                          <div className="font-mono text-accent-amber mb-1">{p.sku}</div>
                          <div className="text-muted text-sm truncate max-w-xs">{p.name}</div>
                        </td>
                        <td>
                          <span className={`badge ${CATEGORY_BADGE_CLASS[p.origin] || 'badge-muted'}`}>
                            {CATEGORY_SHORT[p.origin] || p.origin}
                          </span>
                        </td>
                        <td className="text-right font-mono">
                          <StockCell qty={stockByBranch.mombasa} branch="mombasa" focused={focusedBranch === 'mombasa'} />
                        </td>
                        <td className="text-right font-mono">
                          <StockCell qty={stockByBranch.nairobi} branch="nairobi" focused={focusedBranch === 'nairobi'} />
                        </td>
                        <td className="text-right font-mono">
                          <StockCell qty={stockByBranch.bonje} branch="bonje" focused={focusedBranch === 'bonje'} />
                        </td>
                        <td className="text-right font-mono font-medium">
                          {totalStock.toLocaleString()}
                        </td>
                      </tr>
                    )
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <div className="text-muted text-sm">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} products
            </div>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={buildHref({ page: page - 1 })} className="btn btn-secondary">
                  Previous
                </Link>
              )}
              <span className="px-4 py-2 bg-surface-secondary border border-border rounded-md text-muted text-sm">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link href={buildHref({ page: page + 1 })} className="btn btn-secondary">
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StockCell({ qty, branch, focused }: { qty: number; branch: Branch; focused?: boolean }) {
  const lowStock = qty > 0 && qty < 5
  return (
    <span className={`${focused ? 'font-bold' : ''} ${lowStock ? 'text-red' : qty > 0 ? 'text-primary' : 'text-muted'}`}>
      {qty > 0 ? qty.toLocaleString() : '—'}
    </span>
  )
}