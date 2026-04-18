import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div>
      <div className="section-header mb-16">
        <div><div className="section-title">Users & roles</div><div className="section-sub">Manage team access and department assignments</div></div>
        <button className="btn btn-primary">+ Invite user</button>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.name || 'Unnamed User'}</td>
                <td style={{color:'var(--muted)'}}>{u.email}</td>
                <td>
                  <span className={`badge ${
                    ['ADMIN', 'MANAGER'].includes(u.role) ? 'badge-amber' : 
                    u.role === 'OPERATOR' ? 'badge-purple' : 
                    u.role === 'SALES' ? 'badge-teal' : 
                    'badge-muted'
                  }`}>
                    {u.role.charAt(0) + u.role.slice(1).toLowerCase()}
                  </span>
                </td>
                <td>{u.department || '—'}</td>
                <td><span className="badge badge-green">Active</span></td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} style={{textAlign: 'center', padding: '20px', color: 'var(--muted)'}}>No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}