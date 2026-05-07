import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { inviteUser, updateUser, toggleUserActive, resendInvite, sendPasswordReset } from '@/actions/users'
import { UserForm } from '@/components/users/UserForm'
import { UserTable } from '@/components/users/UserTable'
import type { UserRole, Branch } from '@prisma/client'

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-head text-2xl font-bold">User management</h1>
          <p className="text-muted text-sm mt-1">
            Invite new users and manage roles and access
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            const modal = document.getElementById('invite-modal') as HTMLDialogElement
            modal?.showModal()
          }}
        >
          Invite user
        </button>
      </div>

      <UserTable users={users} />

      {/* Invite Modal */}
      <dialog id="invite-modal" className="modal">
        <div className="modal-box max-w-md">
          <form action={inviteUser} className="space-y-4">
            <h3 className="font-bold text-lg">Invite new user</h3>

            <div>
              <label className="label">
                <span className="label-text">Email address</span>
              </label>
              <input
                type="email"
                name="email"
                className="input input-bordered w-full"
                placeholder="user@company.com"
                required
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Full name</span>
              </label>
              <input
                type="text"
                name="full_name"
                className="input input-bordered w-full"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Role</span>
              </label>
              <select name="role" className="select select-bordered w-full" required>
                <option value="sales">Sales</option>
                <option value="warehouse">Warehouse</option>
                <option value="accountant">Accountant</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Branches</span>
              </label>
              <div className="space-y-2">
                {(['mombasa', 'nairobi', 'bonje'] as Branch[]).map((branch) => (
                  <label key={branch} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="branches"
                      value={branch}
                      className="checkbox"
                      defaultChecked={branch === 'mombasa'}
                    />
                    <span className="capitalize">{branch}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="modal-action">
              <button type="button" className="btn" onClick={() => {
                const modal = document.getElementById('invite-modal') as HTMLDialogElement
                modal?.close()
              }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Send invite
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  )
}