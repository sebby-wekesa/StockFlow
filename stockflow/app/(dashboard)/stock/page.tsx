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
  searchParams: { q?: string; category?: string; branch?: string; page?: string }
}) {
  const q = searchParams.q?.trim() ?? ''
  const category = searchParams.category as ProductCategory | undefined
  const focusedBranch = searchParams.branch as Branch | undefined
  const page = Math.max(1, Number(searchParams.page ?? 1))

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
    prisma.Product.findMany({
      where: productWhere,
      orderBy: { product_code: 'asc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: { stock_levels: true },
    }),
    prisma.Product.count({ where: productWhere }),
    Promise.all(
      ALL_BRANCHES.map(async (branch) => {
        const [stockAgg, lowStock] = await Promise.all([
          prisma.BranchStock.aggregate({
            where: { branch, qty: { gt: 0 } },
            _sum: { qty: true },
            _count: { _all: true },
          }),
          prisma.BranchStock.count({ where: { branch, qty: { gt: 0, lt: 5 } } }),
        ])

        // Compute approximate value: sum(qty * selling_price) for stocked products
        const valuedStock = await prisma.BranchStock.findMany({
          where: { branch, qty: { gt: 0 } },
          include: { product: { select: { selling_price: true } } },
        })
        const value = valuedStock.reduce(
          (sum, s) => sum + s.qty * (Number(s.product.selling_price) || 0),
          0
        )

        return {
          branch,
          totalUnits: stockAgg._sum.qty ?? 0,
          totalSkus: stockAgg._count._all,
          value,
          lowStock,
        }
      })
    ),
    prisma.BranchStock.count({ where: { qty: { gt: 0, lt: 5 } } }),
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
                  const stockByBranch = p.stock_levels.reduce(
                    (acc, s) => ({ ...acc, [s.branch]: s.qty }),
                    {} as Record<Branch, number>
                  )
                  const totalStock = Object.values(stockByBranch).reduce((sum, qty) => sum + qty, 0)
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