import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/auth";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  const roleColors: Record<Role, string> = {
    ADMIN: "bg-red-100 text-red-800",
    MANAGER: "bg-amber-100 text-amber-800",
    OPERATOR: "bg-blue-100 text-blue-800",
    SALES: "bg-green-100 text-green-800",
    PACKAGING: "bg-purple-100 text-purple-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Users</h1>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Department</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 text-sm text-zinc-900">{user.email}</td>
                <td className="px-4 py-3 text-sm text-zinc-600">{user.name || "-"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${roleColors[user.role as Role]}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600">{user.department || "-"}</td>
                <td className="px-4 py-3 text-sm text-zinc-500">{user.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}