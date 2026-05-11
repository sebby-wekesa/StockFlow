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
  searchParams: Promise<{ q?: string; category?: string; branch?: string; page?: string }>
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? ''
  const category = params.category as ProductCategory | undefined
  const focusedBranch = params.branch as Branch | undefined
  const page = Math.max(1, Number(params.page ?? 1))

  // Build product filter
  const productWhere: any = {
    is_active: true,
    category: category ?? { not: 'service' },
  }
  if (q) {
    productWhere.OR = [
      { product_code: { contains: q, mode: 'insensitive' } },
      { canonical_name: { contains: q, mode: 'insensitive' } },
    ]
  }

  // Fetch all the dashboard data in parallel
  const [products, total, branchSummaries, lowStockCount] = await Promise.all([
     prisma.product.findMany({
       where: productWhere,
       orderBy: { product_code: 'asc' },
       take: PAGE_SIZE,
       skip: (page - 1) * PAGE_SIZE,
     }),
    prisma.product.count({ where: productWhere }),
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
            include: { RawMaterial: { select: { unitCost: true } } },
          }),
          prisma.inventoryFinishedGoods.findMany({
            where: { branchId: branch, availableQty: { gt: 0 } },
            include: { FinishedGoods: { select: { unitCost: true } } },
          }),
        ])

        const rawValue = valuedRawStock.reduce(
          (sum, s) => sum + (Number(s.availableKg) * (Number(s.RawMaterial?.unitCost) || 0)),
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

  function buildHref(overrides: { q?: string; category?: string; branch?: string; page?: number }) {
    const params = new URLSearchParams()
    const _q = overrides.q ?? q
    const _cat = overrides.category ?? category
    const _branch = overrides.branch ?? focusedBranch
    const _page = overrides.page ?? page
    if (_q) params.set('q', _q)
    if (_cat) params.set('category', _cat)
    if (_branch) params.set('branch', _branch)
    if (_page > 1) params.set('page', String(_page))
    const qs = params.toString()
    return qs ? `/stock?${qs}` : '/stock'
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-head text-2xl font-bold">Branch stock</h1>
          <p className="text-muted text-sm mt-1">
            Live inventory across all three branches · {lowStockCount} items below reorder point
          </p>
        </div>
        <Link href="/stock/transfer" className="btn btn-primary">
          Transfer stock
        </Link>
      </div>

      {/* BRANCH SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {branchSummaries.map(({ branch, totalUnits, totalSkus, value, lowStock }) => {
          const isFocused = focusedBranch === branch
          const accentClass =
            branch === 'mombasa'
              ? 'border-t-accent'
              : branch === 'nairobi'
              ? 'border-t-teal'
              : 'border-t-purple'
          return (
            <Link
              key={branch}
              href={
                isFocused
                  ? buildHref({ branch: '', page: 1 })
                  : buildHref({ branch, page: 1 })
              }
              className={`card p-5 border-t-4 ${accentClass} transition-all ${
                isFocused
                  ? 'ring-1 ring-accent'
                  : 'hover:bg-surface2'
              }`}
            >
              <div className="font-head text-lg font-bold">{BRANCH_LABELS[branch]}</div>
              <div className="text-xs text-muted mb-3">{BRANCH_SUB[branch]}</div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">SKUs in stock</span>
                  <span className="font-mono font-medium">{totalSkus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Total units</span>
                  <span className="font-mono font-medium">{totalUnits.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Stock value</span>
                  <span className="font-mono font-medium">{formatKES(value)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Low stock alerts</span>
                  <span
                    className={`font-mono font-medium ${
                      lowStock > 0 ? 'text-red' : 'text-muted'
                    }`}
                  >
                    {lowStock}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* CATEGORY FILTER PILLS */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <Link
          href={buildHref({ category: '', page: 1 })}
          className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
            !category
              ? 'bg-accent border-accent text-bg font-semibold'
              : 'bg-surface border-border text-muted hover:border-accent hover:text-text'
          }`}
        >
          All categories
        </Link>
        {(['manufactured_spring', 'manufactured_ubolt', 'imported', 'local_purchase'] as const).map((cat) => (
          <Link
            key={cat}
            href={buildHref({ category: cat, page: 1 })}
            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
              category === cat
                ? 'bg-accent border-accent text-bg font-semibold'
                : 'bg-surface border-border text-muted hover:border-accent hover:text-text'
            }`}
          >
            {CATEGORY_SHORT[cat]}
          </Link>
        ))}
      </div>

      {/* SEARCH FORM */}
      <form className="mb-4">
        {category && <input type="hidden" name="category" value={category} />}
        {focusedBranch && <input type="hidden" name="branch" value={focusedBranch} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by product code or name..."
          className="input max-w-md"
        />
      </form>

      {/* PRODUCT TABLE */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted text-left border-b border-border">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-right">Mombasa</th>
                <th className="px-4 py-3 font-medium text-right">Nairobi</th>
                <th className="px-4 py-3 font-medium text-right">Bonje</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted text-sm">
                    {(q || category || focusedBranch) ? (
                      <>No products match these filters. <Link href="/stock" className="text-accent">Clear filters</Link></>
                    ) : (
                      <>No products found.</>
                    )}
                  </td>
                </tr>
              ) : (
                 products.map((p) => {
                   // Get stock levels for this product from both inventory tables
                   const rawMaterialStock = ALL_BRANCHES.reduce((acc, branch) => {
                     const stock = prisma.inventoryRawMaterial.findFirst({
                       where: { 
                         branchId: branch as string,
                         rawMaterialId: p.id
                       }
                     });
                     return {...acc, [branch]: stock?.availableKg ?? 0};
                   }, {} as Record<Branch, number>);
                   
                   const finishedGoodsStock = ALL_BRANCHES.reduce((acc, branch) => {
                     const stock = prisma.inventoryFinishedGoods.findFirst({
                       where: { 
                         branchId: branch as string,
                         finishedGoodsId: p.id
                       }
                     });
                     return {...acc, [branch]: stock?.availableQty ?? 0};
                   }, {} as Record<Branch, number>);
                   
                   // Combine stock from both sources
                   const stockByBranch: Record<Branch, number> = {};
                   ALL_BRANCHES.forEach(branch => {
                     stockByBranch[branch] = (rawMaterialStock[branch] || 0) + (finishedGoodsStock[branch] || 0);
                   });
                   
                   const totalStock = Object.values(stockByBranch).reduce((sum, qty) => sum + qty, 0);
                  return (
                    <tr key={p.id} className="border-b border-border last:border-b-0 hover:bg-surface2">
                      <td className="px-4 py-3">
                        <div className="font-mono text-accent">{p.product_code}</div>
                        <div className="text-xs text-muted truncate max-w-xs">{p.canonical_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_BADGE_CLASS[p.category]}`}>
                          {CATEGORY_SHORT[p.category]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <StockCell qty={stockByBranch.mombasa ?? 0} branch="mombasa" focused={focusedBranch === 'mombasa'} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <StockCell qty={stockByBranch.nairobi ?? 0} branch="nairobi" focused={focusedBranch === 'nairobi'} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <StockCell qty={stockByBranch.bonje ?? 0} branch="bonje" focused={focusedBranch === 'bonje'} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium">
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
            <div className="text-muted">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} products
            </div>
            <div className="flex gap-2">
              {page > 1 && <Link href={buildHref({ page: page - 1 })} className="btn btn-ghost btn-sm">← Previous</Link>}
              {page < totalPages && <Link href={buildHref({ page: page + 1 })} className="btn btn-ghost btn-sm">Next →</Link>}
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
    <span className={`${focused ? 'font-bold' : ''} ${lowStock ? 'text-red' : qty > 0 ? 'text-text' : 'text-muted'}`}>
      {qty > 0 ? qty.toLocaleString() : '—'}
    </span>
  )
}