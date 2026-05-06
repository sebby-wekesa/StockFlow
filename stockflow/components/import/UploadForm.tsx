'use client'

import { useState, useTransition } from 'react'

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

    // For now, just show a message that this feature is coming soon
    alert('Excel import functionality is coming soon! This would allow bulk upload of products, sales orders, and other data.')
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
        />
        <p className="text-xs text-muted mt-1">
          Upload Excel files (.xlsx, .xls) for bulk data import
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-xs uppercase tracking-wider text-muted mb-2">
          Import Type
        </label>
        <select name="import_type" className="input" disabled>
          <option value="products">Products</option>
          <option value="sales">Sales Orders</option>
          <option value="inventory">Inventory Adjustments</option>
        </select>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={isPending || !file}
          className="btn btn-primary"
        >
          {isPending ? 'Uploading...' : 'Upload & Import'}
        </button>
      </div>

      <div className="mt-4 p-3 bg-blue/10 border border-blue/30 text-blue text-sm rounded">
        <strong>Note:</strong> Excel import functionality is planned for a future update.
        This would include column mapping, data validation, conflict resolution, and batch processing.
      </div>
    </form>
  )
}