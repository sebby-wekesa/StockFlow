import { getUser, Role } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

async function getOperatorStats(department: string | null) {
  if (!department) return null;

  const pendingJobs = await prisma.productionOrder.findMany({
    where: { status: "IN_PRODUCTION" },
    include: {
      design: { include: { stages: true } },
      logs: { orderBy: { sequence: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return { pendingJobs, department };
}

async function getManagerStats() {
  const pendingApprovals = await prisma.productionOrder.findMany({
    where: { status: "PENDING" },
    include: { design: true },
    orderBy: { createdAt: "desc" },
  });

  const designs = await prisma.design.count();

  const recentOrders = await prisma.productionOrder.findMany({
    take: 5,
    include: { design: true },
    orderBy: { createdAt: "desc" },
  });

  return { pendingApprovals, designs, recentOrders };
}

async function getSalesStats() {
  const completedOrders = await prisma.productionOrder.findMany({
    where: { status: "COMPLETED" },
    include: { design: true },
  });

  const availableInventory = await prisma.design.findMany({
    where: { orders: { some: { status: "COMPLETED" } } },
    include: { orders: { where: { status: "COMPLETED" } } },
  });

  return { completedOrders, availableInventory };
}

async function getAdminStats() {
  const totalOrders = await prisma.productionOrder.count();
  const pendingOrders = await prisma.productionOrder.count({ where: { status: "PENDING" } });
  const inProduction = await prisma.productionOrder.count({ where: { status: "IN_PRODUCTION" } });
  const completed = await prisma.productionOrder.count({ where: { status: "COMPLETED" } });
  const designs = await prisma.design.count();
  const users = await prisma.user.count();

  return { totalOrders, pendingOrders, inProduction, completed, designs, users };
}

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
  });

  if (!dbUser) redirect("/login");

  const role = dbUser.role as Role;
  const department = dbUser.department;

  const stats = {
    operator: department ? await getOperatorStats(department) : null,
    manager: (role === "MANAGER" || role === "ADMIN") ? await getManagerStats() : null,
    sales: role === "SALES" ? await getSalesStats() : null,
    admin: role === "ADMIN" ? await getAdminStats() : null,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">
          {role === "OPERATOR" ? `${department} Queue` : "Dashboard"}
        </h1>
      </div>

      {role === "ADMIN" && stats.admin && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard label="Total Orders" value={stats.admin.totalOrders} />
          <StatCard label="Pending" value={stats.admin.pendingOrders} color="amber" />
          <StatCard label="In Production" value={stats.admin.inProduction} color="blue" />
          <StatCard label="Completed" value={stats.admin.completed} color="green" />
          <StatCard label="Designs" value={stats.admin.designs} />
          <StatCard label="Users" value={stats.admin.users} />
        </div>
      )}

      {role === "MANAGER" && stats.manager && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border border-zinc-200"> 
            <h3 className="text-sm font-medium text-zinc-500 mb-2">Pending Approvals</h3>
            <p className="text-3xl font-bold text-amber-600">{stats.manager.pendingApprovals.length}</p>
            <Link href="/approvals" className="text-sm text-blue-600 hover:underline mt-2 block">
              View all →
            </Link>
          </div>
          <div className="bg-white p-6 rounded-lg border border-zinc-200">
            <h3 className="text-sm font-medium text-zinc-500 mb-2">Total Designs</h3>
            <p className="text-3xl font-bold">{stats.manager.designs}</p>
            <Link href="/designs" className="text-sm text-blue-600 hover:underline mt-2 block">
              Manage →
            </Link>
          </div>
          <div className="bg-white p-6 rounded-lg border border-zinc-200">
            <h3 className="text-sm font-medium text-zinc-500 mb-2">Recent Orders</h3>
            <p className="text-3xl font-bold">{stats.manager.recentOrders.length}</p>
            <Link href="/orders" className="text-sm text-blue-600 hover:underline mt-2 block">
              View all →
            </Link>
          </div>
        </div>
      )}

      {role === "OPERATOR" && stats.operator && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">Active Jobs</h2>
          {stats.operator.pendingJobs.length === 0 ? (
            <p className="text-zinc-500">No jobs in queue</p>
          ) : (
            <div className="space-y-3">
              {stats.operator.pendingJobs.map((order) => (
                <JobCard key={order.id} order={order} department={department!} />
              ))}
            </div>
          )}
        </div>
      )}

      {role === "SALES" && stats.sales && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border border-zinc-200">
            <h3 className="text-sm font-medium text-zinc-500 mb-2">Completed Orders</h3>
            <p className="text-3xl font-bold text-green-600">{stats.sales.completedOrders.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-zinc-200">
            <h3 className="text-sm font-medium text-zinc-500 mb-2">Available Products</h3>
            <p className="text-3xl font-bold">{stats.sales.availableInventory.length}</p>
            <Link href="/inventory" className="text-sm text-blue-600 hover:underline mt-2 block">
              View Inventory →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = "zinc" }: { label: string; value: number; color?: "zinc" | "amber" | "blue" | "green" }) {
  const colors = {
    zinc: "text-zinc-900",
    amber: "text-amber-600",
    blue: "text-blue-600",
    green: "text-green-600",
  };
  return (
    <div className="bg-white p-4 rounded-lg border border-zinc-200">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colors[color]}`}>{value}</p>
    </div>
  );
}

function JobCard({ order, department }: { order: any; department: string }) {
  const currentStage = order.design.stages.find((s: any) => s.sequence === order.currentStage);
  const lastLog = order.logs[0];
  
  return (
    <div className="bg-white p-4 rounded-lg border border-zinc-200 flex items-center justify-between">
      <div>
        <h3 className="font-semibold text-zinc-900">{order.design.name}</h3>
        <p className="text-sm text-zinc-500">Order #{order.id.slice(0, 8)}</p>
        <p className="text-sm text-zinc-500">Stage: {currentStage?.name || "Unknown"} ({order.currentStage}/{order.design.stages.length})</p>
        <p className="text-sm text-zinc-500">Target: {order.targetKg} kg | Qty: {order.quantity}</p>
      </div>
      <Link
        href={`/jobs/${order.id}`}
        className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-800"
      >
        Work
      </Link>
    </div>
  );
}