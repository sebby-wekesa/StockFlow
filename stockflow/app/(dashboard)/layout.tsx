import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getUser } from '@/lib/auth';
import { Sidebar } from "@/components/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');

  // 1. Fetch the actual role from the database
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true, department: true }
  });

  const role = profile?.role; // 'SALES', 'PACKAGING', etc.

  if (role === 'PENDING') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h1 className="text-2xl font-bold">Account Under Review</h1>
        <p className="text-gray-500 mt-2">
          Welcome to StockFlow, {user.name}. Your account is pending approval from the Production Manager.
        </p>
        <p className="text-sm text-blue-600 mt-4">We will notify you once your role is assigned.</p>
        <form action="/api/auth/logout" method="post" className="mt-6">
          <button type="submit" className="btn btn-secondary">Logout</button>
        </form>
      </div>
    );
  }

  // 2. Security: If the user is on the wrong page, redirect them
  // This stops the "Permission Denied" flash by catching it before render
  return (
    <div className="flex h-screen bg-zinc-950 text-white">
      <Sidebar role={role} />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

    if (user.role === 'PENDING') {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
          <h1 className="text-2xl font-bold">Account Under Review</h1>
          <p className="text-gray-500 mt-2">
            Welcome to StockFlow, {user.name}. Your account is pending approval from the Production Manager.
          </p>
          <p className="text-sm text-blue-600 mt-4">We will notify you once your role is assigned.</p>
          <form action="/api/auth/logout" method="post" className="mt-6">
            <button type="submit" className="btn btn-secondary">Logout</button>
          </form>
        </div>
      );
    }

    // Role-based permission check
    const rolePermissions = {
      MANAGER: ['/dashboard', '/approvals', '/production', '/reports', '/materials'],
      OPERATOR: ['/dashboard'],
      SALES: ['/dashboard', '/sales-catalog'],
      ADMIN: ['/admin', '/dashboard', '/approvals', '/production', '/reports', '/materials', '/designs', '/orders', '/departments', '/rawmaterials', '/finishedgoods', '/sales', '/packaging', '/users'],
      WAREHOUSE: ['/dashboard', '/receive', '/rawmaterials'],
      PACKAGING: ['/dashboard', '/pack_queue', '/pack_done'],
    };

    const headersList = await headers();
    const pathname = headersList.get('x-pathname') || '/dashboard';

    const allowedPaths = rolePermissions[user.role as keyof typeof rolePermissions] || [];
    if (!allowedPaths.some(path => pathname.startsWith(path))) {
      return (
        <DashboardShell user={user}>
          <div className="card">
            <p className="text-muted text-sm">You don't have permission to view this page.</p>
          </div>
        </DashboardShell>
      );
    }

    return (
      <DashboardShell user={user}>
        {children}
      </DashboardShell>
    );
  }
}