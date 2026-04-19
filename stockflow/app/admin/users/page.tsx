import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { updateUserRole } from "@/app/actions/users";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inviteUser(formData: FormData) {
  "use server";

  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  const role = formData.get("role") as string;

  if (!email || !name || !role) {
    throw new Error("All fields are required");
  }

  // Create user in Supabase Auth
  const { data: authUser, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: "tempPassword123!", // Temporary password, user should change
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  // Create corresponding record in Prisma
  await prisma.user.create({
    data: {
      id: authUser.user!.id,
      email,
      name,
      password: "", // Password handled by Supabase
      role: role as any,
    },
  });

  revalidatePath("/admin/users");
}

async function deleteUser(userId: string) {
  "use server";

  // Delete from Supabase Auth
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authError) {
    throw new Error(`Failed to delete from auth: ${authError.message}`);
  }

  // Delete from Prisma
  await prisma.user.delete({
    where: { id: userId },
  });

  revalidatePath("/admin/users");
}

async function getUsers() {
  return await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true },
    orderBy: { createdAt: "desc" },
  });
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <div className="p-8 bg-[#0f1113] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">User Management</h1>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Invite New User</h2>
        <form action={inviteUser} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-300">
              Role
            </label>
             <select
               id="role"
               name="role"
               required
               className="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
             >
               <option value="PENDING">Pending</option>
               <option value="ADMIN">Admin</option>
               <option value="MANAGER">Manager</option>
               <option value="OPERATOR">Operator</option>
               <option value="WAREHOUSE">Warehouse</option>
               <option value="SALES">Sales</option>
               <option value="PACKAGING">Packaging</option>
             </select>
          </div>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Invite User
          </button>
        </form>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold text-white mb-4">Existing Users</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {user.email}
                  </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                     <form action={updateUserRole} className="inline">
                       <input type="hidden" name="userId" value={user.id} />
                       <select
                         name="newRole"
                         defaultValue={user.role}
                         className="bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          onChange={(e) => e.target.form?.requestSubmit()}
                       >
                         <option value="PENDING">Pending</option>
                         <option value="ADMIN">Admin</option>
                         <option value="MANAGER">Manager</option>
                         <option value="OPERATOR">Operator</option>
                         <option value="WAREHOUSE">Warehouse</option>
                         <option value="SALES">Sales</option>
                         <option value="PACKAGING">Packaging</option>
                       </select>
                     </form>
                   </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <form action={deleteUser.bind(null, user.id)} className="inline">
                      <button
                        type="submit"
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
                        onClick={(e) => {
                          if (!confirm(`Delete user ${user.email}?`)) {
                            e.preventDefault();
                          }
                        }}
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}