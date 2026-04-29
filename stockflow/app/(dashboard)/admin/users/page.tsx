export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { UserRow } from "@/components/admin/UserRow";
import InviteUserModal from "@/components/admin/InviteUserModal";



async function getUsers() {
  try {
    return await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, department: true },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return [];
  }
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <div>
      <div className="section-header mb-16">
        <div>
          <div className="section-title">Users & roles</div>
          <div className="section-sub">Manage team access and department assignments</div>
        </div>
        <InviteUserModal />
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name || 'Unnamed User'}</td>
                <td style={{color:'var(--muted)'}}>{user.email}</td>
                <td>
                  <span className={`badge ${
                    ['ADMIN', 'MANAGER'].includes(user.role) ? 'badge-amber' :
                    user.role === 'OPERATOR' ? 'badge-purple' :
                    user.role === 'SALES' ? 'badge-teal' :
                    'badge-muted'
                  }`}>
                    {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                  </span>
                </td>
                <td>{user.role === 'OPERATOR' ? (user.department || '—') : '—'}</td>
                <td><span className="badge badge-green">Active</span></td>
                <td>
                  <UserRow user={user} />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{textAlign: 'center', padding: '20px', color: 'var(--muted)'}}>
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}