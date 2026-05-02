export const dynamic = 'force-dynamic';

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase-admin";
import type { UserRole } from "@/lib/types";
import { UserRow } from "@/components/admin/UserRow";
import InviteUserModal from "@/components/admin/InviteUserModal";

type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  department: string | null;
};

function getAuthMetadataName(user: { user_metadata?: Record<string, unknown> } | undefined) {
  return typeof user?.user_metadata?.name === "string" ? user.user_metadata.name : null;
}

async function getUsers() {
  try {
    const supabase = supabaseServer() as any;
    if (!supabase) {
      return [] as AdminUserRow[];
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, department')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch users:', error);
      return [] as AdminUserRow[];
    }

    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (authError) {
      console.error('Failed to fetch auth users:', authError);
    }

    const authUsersById = new Map(
      (authData?.users ?? []).map((authUser: { id: string; user_metadata?: Record<string, unknown> }) => [
        authUser.id,
        authUser,
      ]),
    );

    return ((data ?? []) as Omit<AdminUserRow, "name">[]).map((profile) => ({
      ...profile,
      name: getAuthMetadataName(authUsersById.get(profile.id)),
    }));
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return [] as AdminUserRow[];
  }
}

export default async function AdminUsersPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/unauthorized");
  }

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
