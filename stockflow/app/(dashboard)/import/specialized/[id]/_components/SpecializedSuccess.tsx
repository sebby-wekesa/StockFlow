'use client'

import Link from 'next/link'
import type { ImportBatch } from '@prisma/client'

interface SpecializedSuccessProps {
  batch: ImportBatch & {
    created_by_user: { full_name: string }
  }
}

export function SpecializedSuccess({ batch }: SpecializedSuccessProps) {
  const mapping_config = (batch.mapping_config as any) ?? {}
  const errorSummary = batch.error_summary ?? ''
  const okCount = batch.ok_count ?? 0
  const skippedCount = batch.skipped_count ?? 0
  const errorCount = batch.error_count ?? 0

  // Extract unmatched names from error summary if present
  const unmatchedNames = mapping_config.unmatched_names ?? []

  return (
    <div className="space-y-6">
      {/* SUCCESS BANNER */}
      <div className="card p-6 border-green-500/30 bg-green-500/5">
        <div className="flex items-start gap-4">
          <div className="text-4xl text-green-500">✓</div>
          <div>
            <h2 className="font-head font-bold text-lg text-green-600 mb-1">Import completed</h2>
            <p className="text-sm text-muted">
              {okCount} rows written · {skippedCount} skipped · {errorCount} errors
            </p>
            {batch.imported_at && (
              <p className="text-xs text-muted mt-2">
                Imported at {new Date(batch.imported_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* RESULTS KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 text-center border-green-500/30">
          <div className="text-3xl font-bold text-green-600">{okCount}</div>
          <div className="text-sm text-muted mt-1">Successfully written</div>
        </div>
        {skippedCount > 0 && (
          <div className="card p-4 text-center border-orange-500/30">
            <div className="text-3xl font-bold text-orange-600">{skippedCount}</div>
            <div className="text-sm text-muted mt-1">Skipped / unmatched</div>
          </div>
        )}
        {errorCount > 0 && (
          <div className="card p-4 text-center border-red-500/30">
            <div className="text-3xl font-bold text-red-600">{errorCount}</div>
            <div className="text-sm text-muted mt-1">Errors</div>
          </div>
        )}
      </div>

      {/* UNMATCHED NAMES REPORT */}
      {unmatchedNames && unmatchedNames.length > 0 && (
        <div className="card p-6 border-orange-500/30">
          <div className="mb-4">
            <h3 className="font-head font-bold text-orange-600 mb-1">
              Unmatched product names ({unmatchedNames.length})
            </h3>
            <p className="text-sm text-muted">
              These raw product names couldn't be matched against the master. Add aliases
              to auto-resolve them on the next import.
            </p>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {unmatchedNames.map((item: any, idx: number) => (
              <div
                key={idx}
                className="flex items-start justify-between p-3 bg-surface2 rounded-md"
              >
                <div className="flex-1">
                  <div className="font-mono text-sm break-words">{item.raw_name}</div>
                  <div className="text-xs text-muted mt-1">
                    {item.rows?.length ?? 1} row{item.rows?.length !== 1 ? 's' : ''} ·{' '}
                    {item.total_qty} units
                  </div>
                </div>
                <Link
                  href={`/products/add-alias?name=${encodeURIComponent(item.raw_name)}`}
                  className="text-xs px-2 py-1 rounded bg-accent/15 text-accent hover:bg-accent/25 whitespace-nowrap"
                >
                  Add alias →
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-md">
            <p className="text-xs text-blue-600">
              <strong>Tip:</strong> After adding aliases, re-upload the same file. The new aliases
              will be picked up on the next parse.
            </p>
          </div>
        </div>
      )}

      {/* ERROR DETAILS */}
      {errorSummary && (
        <div className="card p-6 border-red-500/30">
          <h3 className="font-head font-bold text-red-600 mb-3">Error details</h3>
          <pre className="text-xs bg-surface2 p-3 rounded overflow-x-auto text-muted">
            {errorSummary}
          </pre>
        </div>
      )}

      {/* NEXT STEPS */}
      <div className="card p-6">
        <h3 className="font-head font-bold mb-3">Next steps</h3>
        <ul className="space-y-2 text-sm">
          {batch.sheet_type === 'sales_quickbooks_v2' && (
            <>
              <li>✓ Sales orders and stock movements have been created</li>
              <li>→ Review the orders in <Link href="/sales" className="text-accent hover:underline">Sales</Link></li>
              {skippedCount > 0 && (
                <li>
                  ⚠ Add aliases for unmatched products and re-import to capture those sales
                </li>
              )}
            </>
          )}
          {(batch.sheet_type === 'springs_master' || batch.sheet_type === 'ubolt_master') && (
            <>
              <li>✓ Products have been added to the master catalogue</li>
              <li>→ View products in <Link href="/products" className="text-accent hover:underline">Catalogue</Link></li>
            </>
          )}
          {batch.sheet_type === 'consumables_stock' && (
            <>
              <li>✓ Stock movements have been recorded</li>
              <li>→ Review stock levels in <Link href="/stock" className="text-accent hover:underline">Inventory</Link></li>
              {skippedCount > 0 && (
                <li>
                  ⚠ Some products weren't matched. Add them to the master or create aliases.
                </li>
              )}
            </>
          )}
        </ul>
      </div>

      {/* RETURN LINK */}
      <div className="flex gap-2">
        <Link href="/import" className="btn btn-secondary">
          ← Back to import centre
        </Link>
      </div>
    </div>
  )
}
