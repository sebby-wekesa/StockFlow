import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getUser } from '@/lib/auth'
import { JOB_STATUS_LABELS, JOB_STATUS_BADGE_CLASS } from '@/lib/production'

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string }
}) {
  const user = await getUser()
  if (!user) return null

  const status = searchParams.status as 'open' | 'in_progress' | 'complete' | 'cancelled' | undefined
  const page = Math.max(1, Number(searchParams.page ?? 1))

  const where: any = {}
  if (status) where.status = status

  const [jobs, total] = await Promise.all([
    prisma.public.JobCard.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        product: { select: { product_code: true, canonical_name: true } },
        stages: {
          select: { stage_number: true, completed_at: true, qty_in: true, qty_out: true }
        }
      }
    }),
    prisma.public.JobCard.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-head text-2xl font-bold">Job cards</h1>
          <p className="text-muted text-sm mt-1">
            Production orders and manufacturing workflow
          </p>
        </div>
        <Link href="/jobs/new" className="btn btn-primary">
          + New job card
        </Link>
      </div>

      {/* STATUS FILTERS */}
      <div className="flex gap-2 mb-6">
        {(['open', 'in_progress', 'complete', 'cancelled'] as const).map((statusKey) => (
          <Link
            key={statusKey}
            href={status === statusKey ? '/jobs' : `/jobs?status=${statusKey}`}
            className={`btn btn-sm ${
              status === statusKey ? 'btn-primary' : 'btn-outline'
            }`}
          >
            {JOB_STATUS_LABELS[statusKey]}
          </Link>
        ))}
      </div>

      {/* JOBS LIST */}
      <div className="space-y-4">
        {jobs.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <p className="mb-4">No job cards found.</p>
            <Link href="/jobs/new" className="btn btn-primary">
              Create your first job card
            </Link>
          </div>
        ) : (
          jobs.map((job) => {
            const completedStages = job.stages.filter(s => s.completed_at).length
            const totalStages = job.stages.length
            const currentStage = job.stages.find(s => !s.completed_at)

            return (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="card p-6 hover:bg-surface2 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">Job {job.id.slice(-6)}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${JOB_STATUS_BADGE_CLASS[job.status]}`}>
                        {JOB_STATUS_LABELS[job.status]}
                      </span>
                    </div>

                    <div className="text-sm text-muted mb-3">
                      {job.product.product_code} - {job.product.canonical_name}
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span>Ordered: <strong>{job.qty_ordered}</strong> units</span>
                      <span>Progress: <strong>{completedStages}/{totalStages}</strong> stages</span>
                      {currentStage && (
                        <span>Current: Stage {currentStage.stage_number} ({currentStage.qty_in} units)</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-muted">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Link>
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
