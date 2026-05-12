import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/auth'

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20

const PRODUCTION_STATUS_BADGE_CLASS: Record<string, string> = {
  PENDING: 'bg-surface2 text-muted',
  APPROVED: 'bg-blue/15 text-blue',
  IN_PRODUCTION: 'bg-purple/15 text-purple',
  COMPLETED: 'bg-teal/15 text-teal',
  REJECTED: 'bg-red/15 text-red',
  CANCELLED: 'bg-red/15 text-red',
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const user = await getUser()
  if (!user) return null

  const params = await searchParams
  const status = params.status as 'PENDING' | 'APPROVED' | 'IN_PRODUCTION' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | undefined
  const page = Math.max(1, Number(params.page ?? 1))

  const where: any = {}
  if (status) where.status = status

  const [jobs, total] = await Promise.all([
    prisma.productionOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        Design: { select: { name: true } },
        StageLog: {
          select: { completedAt: true, kgIn: true, kgOut: true, sequence: true }
        }
      }
    }),
    prisma.productionOrder.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-head text-2xl font-bold">Production orders</h1>
          <p className="text-muted text-sm mt-1">
            Manufacturing workflow and job tracking
          </p>
        </div>
        <Link href="/production/new" className="btn btn-primary">
          + New production order
        </Link>
      </div>

      {/* STATUS FILTERS */}
      <div className="flex gap-2 mb-6">
        {(['PENDING', 'APPROVED', 'IN_PRODUCTION', 'COMPLETED', 'CANCELLED'] as const).map((statusKey) => (
          <Link
            key={statusKey}
            href={status === statusKey ? '/jobs' : `/jobs?status=${statusKey}`}
            className={`btn btn-sm ${
              status === statusKey ? 'btn-primary' : 'btn-outline'
            }`}
          >
            {statusKey.replace('_', ' ')}
          </Link>
        ))}
      </div>

      {/* JOBS LIST */}
      <div className="space-y-4">
        {jobs.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <p className="mb-4">No production orders found.</p>
            <p className="text-sm">Production orders will appear here once created.</p>
          </div>
        ) : (
          jobs.map((job) => {
            const completedStages = job.StageLog.filter(s => s.completedAt).length
            const totalStages = job.StageLog.length
            const currentStage = job.StageLog.find(s => !s.completedAt)

            return (
              <div
                key={job.id}
                className="card p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">Order {job.orderNumber}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${PRODUCTION_STATUS_BADGE_CLASS[job.status] || 'bg-gray/15 text-gray'}`}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-sm text-muted mb-3">
                      {job.Design?.name || 'Unknown Design'}
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span>Quantity: <strong>{job.quantity}</strong> units</span>
                      <span>Target: <strong>{job.targetKg}kg</strong></span>
                      <span>Progress: <strong>{completedStages}/{totalStages}</strong> stages</span>
                      {currentStage && (
                        <span>Current: Stage {currentStage.sequence} ({currentStage.kgIn}kg in)</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-muted">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 gap-2">
          {page > 1 && (
            <Link
              href={`/jobs?${new URLSearchParams({ status: status || '', page: String(page - 1) })}`}
              className="btn btn-sm btn-outline"
            >
              Previous
            </Link>
          )}

          <span className="btn btn-sm btn-disabled">
            Page {page} of {totalPages}
          </span>

          {page < totalPages && (
            <Link
              href={`/jobs?${new URLSearchParams({ status: status || '', page: String(page + 1) })}`}
              className="btn btn-sm btn-outline"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
