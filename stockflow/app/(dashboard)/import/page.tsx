import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { UploadForm } from '@/components/import/UploadForm'

export const dynamic = 'force-dynamic'

export default async function ImportPage() {
  // Show recent in-progress imports so user can resume
  const recentBatches = await prisma.importBatch?.findMany({
    where: { status: { notIn: ['imported', 'failed'] } },
    orderBy: { created_at: 'desc' },
    take: 5,
    include: { User: { select: { name: true } } },
  }) || []

  return (
    <div>
      <div className="section-header mb-16">
        <div>
          <div className="section-title">Import Centre</div>
          <div className="section-sub">Upload Excel files for bulk data import</div>
        </div>
        <Link href="/import/history" className="btn btn-secondary">
          View History
        </Link>
      </div>

      {recentBatches.length > 0 && (
        <div className="card mb-16">
          <div className="section-header mb-4">
            <div className="section-title text-purple">In-Progress Imports</div>
          </div>
          <div className="space-y-3">
            {recentBatches.map((batch) => (
              <Link
                key={batch.id}
                href={`/import/${batch.id}`}
                className="flex items-center justify-between p-4 bg-surface-secondary rounded-md hover:bg-surface transition-colors border border-border"
              >
                <div className="flex-1">
                  <div className="font-medium text-primary mb-1">{batch.file_name}</div>
                  <div className="text-muted text-sm">
                    {batch.row_count} rows · {batch.sheet_type} · {batch.User?.name || 'Unknown'} ·{' '}
                    {new Date(batch.created_at).toLocaleString()}
                  </div>
                </div>
                <span className="badge badge-purple capitalize ml-4">
                  {batch.status.replace('_', ' ')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <UploadForm />
    </div>
  )
}