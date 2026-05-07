'use client'

import { useState } from 'react'
import { inviteUser } from '@/actions/users'
import { UserForm } from '@/components/users/UserForm'
import type { User } from '@prisma/client'

interface InviteModalProps {
  onClose: () => void
}

function InviteModal({ onClose }: InviteModalProps) {
  return (
    <dialog className="modal modal-open">
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
              {(['mombasa', 'nairobi', 'bonje'] as const).map((branch) => (
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
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Send invite
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  )
}

interface UserTableProps {
  users: User[]
}

function UserTable({ users }: UserTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="card">
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Branches</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="font-medium">{user.full_name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`badge ${
                    user.role === 'admin' ? 'badge-error' :
                    user.role === 'manager' ? 'badge-warning' :
                    user.role === 'warehouse' ? 'badge-info' :
                    user.role === 'sales' ? 'badge-success' :
                    'badge-neutral'
                  } badge-sm`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {user.branches.map((branch) => (
                      <span key={branch} className="badge badge-outline badge-xs">
                        {branch}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className={`badge ${user.is_active ? 'badge-success' : 'badge-error'} badge-sm`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => setEditingId(user.id)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingId && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Edit user</h3>
            <UserForm
              mode="edit"
              initial={users.find((u) => u.id === editingId)}
              action={async (formData) => {
                // This would need to be implemented
                console.log('Update user:', editingId, formData)
                setEditingId(null)
              }}
            />
          </div>
          <div className="modal-backdrop" onClick={() => setEditingId(null)} />
        </dialog>
      )}
    </div>
  )
}

export { InviteModal, UserTable }