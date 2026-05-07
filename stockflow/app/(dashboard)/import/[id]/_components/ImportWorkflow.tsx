import Link from 'next/link'
import { ImportStepper } from './ImportStepper'
import { ColumnMapper } from './ColumnMapper'
import { MatchResults } from './MatchResults'
import { SuccessView } from './SuccessView'
import type { ImportBatch, ImportRow } from '@prisma/client'

interface ImportWorkflowProps {
  batch: ImportBatch & {
    created_by_user: { full_name: string }
    rows: ImportRow[]
  }
}

export function ImportWorkflow({ batch }: ImportWorkflowProps) {
  const renderStep = () => {
    switch (batch.status) {
      case 'uploaded':
      case 'mapping':
        return <ColumnMapper batch={batch} />
      case 'validating':
        return <div className="text-center py-8">Validating and matching products...</div>
      case 'preview':
        return <MatchResults batch={batch} />
      case 'committing':
        return <div className="text-center py-8">Committing import...</div>
      case 'imported':
        return <SuccessView batch={batch} />
      case 'failed':
        return <div className="text-center py-8 text-red-400">Import failed</div>
      default:
        return <div>Unknown status</div>
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/import" className="text-muted hover:text-foreground">
              Import centre
            </Link>
            <span className="text-muted">/</span>
            <span>{batch.file_name}</span>
          </div>
          <h1 className="font-head text-2xl font-bold">{batch.file_name}</h1>
          <p className="text-muted text-sm mt-1">
            {batch.row_count} rows · {batch.sheet_type} · Uploaded by {batch.created_by_user.full_name}
          </p>
        </div>
      </div>

      <ImportStepper status={batch.status} />

      <div className="mt-6">
        {renderStep()}
      </div>
    </div>
  )
}