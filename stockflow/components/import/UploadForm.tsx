'use client'

import { useState, useTransition } from 'react'
import { uploadImport } from '@/app/(dashboard)/import/actions'
import { SHEET_TYPE_LABELS, type SheetType } from '@/lib/import/parsers'
import { ALL_BRANCHES } from '@/lib/branches'

export function UploadForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!file) {
      setError('Please choose a file')
      return
    }

    startTransition(async () => {
      try {
        const formData = new FormData(e.target as HTMLFormElement)
        formData.set('file', file)
        await uploadImport(formData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6">
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-xs uppercase tracking-wider text-muted mb-2">
          Excel File
        </label>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="input"
          disabled={isPending}
          required
        />
        <p className="text-xs text-muted mt-1">
          Upload Excel files (.xlsx, .xls) for bulk data import
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-xs uppercase tracking-wider text-muted mb-2">
          File Type
        </label>
        <select name="sheet_type" className="input" defaultValue="auto" disabled={isPending}>
          <option value="auto">Auto-detect</option>
          {(Object.entries(SHEET_TYPE_LABELS) as [SheetType, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-xs uppercase tracking-wider text-muted mb-2">
          Import Mode
        </label>
        <select name="import_mode" defaultValue="update" className="input" disabled={isPending}>
          <option value="update">Update — update existing records</option>
          <option value="ignore">Ignore — only import new products</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-xs uppercase tracking-wider text-muted mb-2">
          Target Branch
        </label>
        <select name="target_branch" className="input" disabled={isPending}>
          <option value="">All branches</option>
          {ALL_BRANCHES.map((branch) => (
            <option key={branch} value={branch}>
              {branch.charAt(0).toUpperCase() + branch.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={isPending || !file}
          className="btn btn-primary"
        >
          {isPending ? 'Uploading...' : 'Upload & Parse'}
        </button>
      </div>
    </form>
  )
}