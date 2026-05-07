'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ALL_BRANCHES, BRANCH_LABELS } from '@/lib/branches'
import type { Branch, UserRole } from '@prisma/client'

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full access including user management and imports',
  },
  {
    value: 'manager',
    label: 'Manager',
    description: 'Can approve, view all reports, manage production',
  },
  {
    value: 'warehouse',
    label: 'Warehouse',
    description: 'Receive raw materials, manage production stages',
  },
  {
    value: 'sales',
    label: 'Sales',
    description: 'Record sales for assigned branches',
  },
  {
    value: 'accountant',
    label: 'Accountant',
    description: 'Read-only access to all reports and data',
  },
]

type Initial = {
  email?: string
  name?: string
  role?: UserRole
  branches?: Branch[]
}

export function UserForm({
  mode,
  initial,
  action,
}: {
  mode: 'invite' | 'edit'
  initial?: Initial
  action: (formData: FormData) => Promise<void>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await action(new FormData(e.currentTarget))
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">
            <span className="label-text">Full name</span>
          </label>
          <input
            type="text"
            name="name"
            className="input input-bordered w-full"
            defaultValue={initial?.name}
            required
          />
        </div>

        {mode === 'invite' && (
          <div>
            <label className="label">
              <span className="label-text">Email address</span>
            </label>
            <input
              type="email"
              name="email"
              className="input input-bordered w-full"
              defaultValue={initial?.email}
              required
            />
          </div>
        )}
      </div>

      <div>
        <label className="label">
          <span className="label-text">Role</span>
        </label>
        <select
          name="role"
          className="select select-bordered w-full"
          defaultValue={initial?.role}
          required
        >
          {ROLE_OPTIONS.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
        <div className="text-sm text-gray-600 mt-1">
          {ROLE_OPTIONS.find((r) => r.value === initial?.role)?.description}
        </div>
      </div>

      <div>
        <label className="label">
          <span className="label-text">Branch access</span>
        </label>
        <div className="grid grid-cols-3 gap-4">
          {ALL_BRANCHES.map((branch) => (
            <label key={branch} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="branches"
                value={branch}
                className="checkbox"
                defaultChecked={initial?.branches?.includes(branch as Branch) ?? (branch === 'mombasa')}
              />
              <span>{BRANCH_LABELS[branch]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? 'Saving...' : mode === 'invite' ? 'Send invite' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}