import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SpecializedPreview } from './_components/SpecializedPreview'
import { SpecializedSuccess } from './_components/SpecializedSuccess'

export const dynamic = 'force-dynamic'

export default async function SpecializedImportPage({
  params,
}: {
  params: { id: string }
}) {
  const batch = await prisma.importBatch.findUnique({
    where: { id: params.id },
    include: { created_by_user: { select: { full_name: true } } },
  })

  if (!batch) {
    notFound()
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <Link href="/import" className="text-muted hover:text-foreground text-sm">
          Import centre
        </Link>
        <span className="text-muted mx-2">/</span>
        <span className="text-sm">{batch.file_name}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-head text-2xl font-bold">{batch.file_name}</h1>
          <p className="text-muted text-sm mt-1">
            {batch.row_count} rows · {batch.sheet_type} · {batch.created_by_user.full_name} ·{' '}
            {new Date(batch.created_at).toLocaleString()}
          </p>
        </div>
        <div className="text-sm px-3 py-1 rounded-full bg-accent/15 text-accent font-medium">
          {batch.status === 'preview' ? 'Ready to commit' : batch.status}
        </div>
      </div>

      {batch.status === 'imported' ? (
        <SpecializedSuccess batch={batch} />
      ) : (
        <SpecializedPreview batch={batch} />
      )}
    </div>
  )
}
