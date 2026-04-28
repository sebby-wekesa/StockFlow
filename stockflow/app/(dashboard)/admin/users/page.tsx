export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { UserRow } from "@/components/admin/UserRow";
import InviteUserModal from "@/components/admin/InviteUserModal";



async function getUsers() {
  try {
    return await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true },
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
    <>
      <div className="section-header">
        <div>
          <h1 className="section-title">User Management</h1>
        </div>
        <InviteUserModal />
      </div>

      <div className="card">
        <h2 className="section-title mb-4">Existing Users</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow key={user.id} user={user} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}