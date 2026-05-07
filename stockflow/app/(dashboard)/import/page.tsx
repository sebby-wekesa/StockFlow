import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { UploadForm } from '@/components/import/UploadForm'

export default async function ImportPage() {
  // Show recent in-progress imports so user can resume
  const recentBatches = await prisma.importBatch?.findMany({
    where: { status: { notIn: ['imported', 'failed'] } },
    orderBy: { created_at: 'desc' },
    take: 5,
    include: { created_by_user: { select: { name: true } } },
  }) || []

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-head text-2xl font-bold">Import centre</h1>
          <p className="text-muted text-sm mt-1">
            Upload Excel files for bulk data import
          </p>
        </div>
        <Link href="/import/history" className="btn btn-ghost">
          History
        </Link>
      </div>

      {recentBatches.length > 0 && (
        <div className="card p-4 mb-6 border-purple/30">
          <div className="font-head font-bold text-sm mb-3 text-purple">
            In-progress imports
          </div>
          <div className="space-y-2">
            {recentBatches.map((batch) => (
              <Link
                key={batch.id}
                href={`/import/${batch.id}`}
                className="flex items-center justify-between p-3 bg-surface2 rounded-md hover:bg-surface transition-colors"
              >
                <div>
                  <div className="text-sm font-medium">{batch.file_name}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {batch.row_count} rows · {batch.sheet_type} · {batch.created_by_user.name} ·{' '}
                    {new Date(batch.created_at).toLocaleString()}
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple/15 text-purple capitalize">
                  {batch.status}
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