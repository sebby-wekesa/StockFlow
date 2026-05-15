import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { QuickImportForm } from './_components/QuickImportForm'

export const dynamic = 'force-dynamic'

export default async function ImportCentrePage() {
  // Recent batches across both flows
  const recentBatches = await prisma.importBatch.findMany({
    orderBy: { created_at: 'desc' },
    take: 5,
    include: { created_by_user: { select: { full_name: true, name: true } } },
  })

  // Separate specialized (preview-ready) from generic imports
  const specializedPreviews = recentBatches.filter(
    (b) =>
      (b.mapping_config as any)?.specialized === true &&
      b.status === 'preview'
  )
  const inProgress = recentBatches.filter(
    (b) =>
      !(b.mapping_config as any)?.specialized &&
      b.status !== 'imported' &&
      b.status !== 'failed'
  )

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-head text-2xl font-bold">Import centre</h1>
          <p className="text-muted text-sm mt-1">
            Upload Excel files. Aliases auto-resolve product names against the master.
          </p>
        </div>
        <Link href="/import/history" className="btn btn-secondary">
          History
        </Link>
      </div>

      {/* PENDING SPECIALIZED PREVIEWS */}
      {specializedPreviews.length > 0 && (
        <div className="card p-4 mb-6 border-accent/30">
          <div className="font-head font-bold text-sm mb-3 text-accent">
            Awaiting commit ({specializedPreviews.length})
          </div>
          <div className="space-y-2">
            {specializedPreviews.map((b) => (
              <Link
                key={b.id}
                href={`/import/specialized/${b.id}`}
                className="flex items-center justify-between p-3 bg-surface2 rounded-md hover:bg-surface transition-colors"
              >
                <div>
                  <div className="text-sm font-medium">{b.file_name}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {b.row_count} rows · {b.sheet_type} · {b.created_by_user.full_name || b.created_by_user.name || 'Unknown'} ·{' '}
                    {new Date(b.created_at).toLocaleString()}
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                  Ready to commit
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* IN-PROGRESS GENERIC IMPORTS */}
      {inProgress.length > 0 && (
        <div className="card p-4 mb-6 border-purple/30">
          <div className="font-head font-bold text-sm mb-3 text-purple">
            In-progress ({inProgress.length})
          </div>
          <div className="space-y-2">
            {inProgress.map((b) => (
              <Link
                key={b.id}
                href={`/import/${b.id}`}
                className="flex items-center justify-between p-3 bg-surface2 rounded-md hover:bg-surface transition-colors"
              >
                <div>
                  <div className="text-sm font-medium">{b.file_name}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {b.row_count} rows · {b.sheet_type} · {b.created_by_user.full_name || b.created_by_user.name || 'Unknown'} ·{' '}
                    {new Date(b.created_at).toLocaleString()}
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple/15 text-purple capitalize">
                  {b.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* QUICK IMPORT */}
      <div className="mb-2">
        <h2 className="font-head font-bold text-lg">Quick import (Springtech files)</h2>
        <p className="text-muted text-sm">
          Handles QuickBooks sales exports, Springs/U-bolt masters, and consumables stock files.
        </p>
      </div>

      <QuickImportForm />
    </div>
  )
}