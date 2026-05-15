'use client'

import { useState, useTransition } from 'react'
import { commitSpecializedBatch } from '@/lib/import/specialized-actions'
import type { ImportBatch } from '@prisma/client'

interface SpecializedPreviewProps {
  batch: ImportBatch & {
    created_by_user: { full_name: string }
  }
}

export function SpecializedPreview({ batch }: SpecializedPreviewProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const mapping_config = (batch.mapping_config as any) ?? {}
  const preview = mapping_config.preview ?? []
  const sourceLabel = mapping_config.source_label ?? batch.sheet_type

  function handleCommit() {
    setError(null)
    startTransition(async () => {
      try {
        await commitSpecializedBatch(batch.id)
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* SUMMARY CARD */}
      <div className="card p-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-3xl font-bold text-accent">{batch.row_count}</div>
            <div className="text-sm text-muted mt-1">Total rows</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-500">{preview.length}</div>
            <div className="text-sm text-muted mt-1">Preview rows</div>
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">{sourceLabel}</div>
            <div className="text-sm text-muted mt-1">Source type</div>
          </div>
        </div>
      </div>

      {/* PARSED DATA TABLE */}
      <div className="card p-6">
        <h2 className="font-head font-bold text-lg mb-4">Sample of parsed rows (first 10)</h2>
        <div className="overflow-x-auto">
          <PreviewTable rows={preview} sheetType={batch.sheet_type} />
        </div>
        {preview.length === 0 && (
          <div className="text-center py-8 text-muted">No rows to preview</div>
        )}
      </div>

      {/* COMMIT BUTTON */}
      <div className="card p-6 border-accent/30">
        <div className="mb-4">
          <h3 className="font-head font-bold mb-2">Ready to import</h3>
          <p className="text-sm text-muted">
            Review the preview above. When ready, click "Commit" to write {batch.row_count} rows to the database.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={handleCommit}
            disabled={isPending}
            className="btn btn-primary"
          >
            {isPending ? 'Committing...' : 'Commit Import'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface PreviewTableProps {
  rows: any[]
  sheetType: string
}

function PreviewTable({ rows, sheetType }: PreviewTableProps) {
  if (sheetType === 'sales_quickbooks_v2') {
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border2">
            <th className="text-left py-2 px-3 text-muted font-medium">Date</th>
            <th className="text-left py-2 px-3 text-muted font-medium">Invoice</th>
            <th className="text-left py-2 px-3 text-muted font-medium">Customer</th>
            <th className="text-left py-2 px-3 text-muted font-medium">Product</th>
            <th className="text-right py-2 px-3 text-muted font-medium">Qty</th>
            <th className="text-right py-2 px-3 text-muted font-medium">Price</th>
            <th className="text-right py-2 px-3 text-muted font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border2">
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-surface2">
              <td className="py-2 px-3 text-muted">{row.movement_date ? new Date(row.movement_date).toLocaleDateString() : '-'}</td>
              <td className="py-2 px-3 font-mono">{row.order_number || '-'}</td>
              <td className="py-2 px-3">{row.customer_name || '-'}</td>
              <td className="py-2 px-3 truncate">{row.raw_product_name || '-'}</td>
              <td className="py-2 px-3 text-right">{row.qty || '-'}</td>
              <td className="py-2 px-3 text-right">{row.unit_price ? row.unit_price.toFixed(2) : '-'}</td>
              <td className="py-2 px-3 text-right font-medium">{row.amount ? row.amount.toFixed(2) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (sheetType === 'springs_master' || sheetType === 'ubolt_master') {
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border2">
            <th className="text-left py-2 px-3 text-muted font-medium">Code</th>
            <th className="text-left py-2 px-3 text-muted font-medium">Product Name</th>
            <th className="text-left py-2 px-3 text-muted font-medium">Make</th>
            <th className="text-left py-2 px-3 text-muted font-medium">Position</th>
            <th className="text-left py-2 px-3 text-muted font-medium">Type</th>
            <th className="text-right py-2 px-3 text-muted font-medium">Cost</th>
            <th className="text-right py-2 px-3 text-muted font-medium">Selling</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border2">
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-surface2">
              <td className="py-2 px-3 font-mono text-xs">{row.product_code}</td>
              <td className="py-2 px-3 truncate">{row.canonical_name}</td>
              <td className="py-2 px-3">{row.vehicle_make || '-'}</td>
              <td className="py-2 px-3">{row.spring_position || row.leaf_position || '-'}</td>
              <td className="py-2 px-3 text-xs">{row.product_type}</td>
              <td className="py-2 px-3 text-right">{row.cost_price ? row.cost_price.toFixed(2) : '-'}</td>
              <td className="py-2 px-3 text-right">{row.selling_price ? row.selling_price.toFixed(2) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (sheetType === 'consumables_stock') {
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border2">
            <th className="text-left py-2 px-3 text-muted font-medium">Date</th>
            <th className="text-left py-2 px-3 text-muted font-medium">Product</th>
            <th className="text-left py-2 px-3 text-muted font-medium">Branch</th>
            <th className="text-left py-2 px-3 text-muted font-medium">Direction</th>
            <th className="text-right py-2 px-3 text-muted font-medium">Qty</th>
            <th className="text-left py-2 px-3 text-muted font-medium">Reference</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border2">
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-surface2">
              <td className="py-2 px-3 text-muted">{row.movement_date ? new Date(row.movement_date).toLocaleDateString() : '-'}</td>
              <td className="py-2 px-3 truncate">{row.raw_product_name || '-'}</td>
              <td className="py-2 px-3 capitalize">{row.branch || '-'}</td>
              <td className="py-2 px-3">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  row.direction === 'in'
                    ? 'bg-green-500/15 text-green-600'
                    : row.direction === 'out'
                    ? 'bg-red-500/15 text-red-600'
                    : 'bg-blue-500/15 text-blue-600'
                }`}>
                  {row.direction}
                </span>
              </td>
              <td className="py-2 px-3 text-right">{row.qty || '-'}</td>
              <td className="py-2 px-3 text-xs font-mono">{row.reference || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  // Fallback: generic table
  return (
    <div className="text-center py-8 text-muted">
      Unknown sheet type. Cannot display preview for {sheetType}.
    </div>
  )
}
