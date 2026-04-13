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
    <div>
      <div className="section-header mb-16">
        <div>
          <div className="section-title">
            {role === "OPERATOR" ? `${department} Queue` : "Overview"}
          </div>
          <div className="section-sub">
            Welcome back, {user.name || user.email}
          </div>
        </div>
      </div>

      {role === "ADMIN" && stats.admin && (
        <div className="stats-grid">
          <StatCard label="Total Orders" value={stats.admin.totalOrders} />
          <StatCard label="Pending Approval" value={stats.admin.pendingOrders} color="amber" />
          <StatCard label="In Production" value={stats.admin.inProduction} color="purple" />
          <StatCard label="Completed" value={stats.admin.completed} color="green" />
          <StatCard label="Total Designs" value={stats.admin.designs} />
          <StatCard label="Total Users" value={stats.admin.users} />
        </div>
      )}

      {role === "MANAGER" && stats.manager && (
        <div className="grid-3 mb-24">
          <div className="stat-card amber">
            <div className="stat-label">Pending Approvals</div>
            <div className="stat-value">{stats.manager.pendingApprovals.length}</div>
            <Link href="/approvals" className="stat-sub hover:underline">
              View all pending orders →
            </Link>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Designs</div>
            <div className="stat-value">{stats.manager.designs}</div>
            <Link href="/designs" className="stat-sub hover:underline">
              Manage design templates →
            </Link>
          </div>
          <div className="stat-card">
            <div className="stat-label">Recent Orders</div>
            <div className="stat-value">{stats.manager.recentOrders.length}</div>
            <Link href="/orders" className="stat-sub hover:underline">
              View production history →
            </Link>
          </div>
        </div>
      )}

      {role === "OPERATOR" && stats.operator && (
        <div className="mb-24">
          <div className="section-header mb-16">
            <div className="section-title">{department} dept — job queue</div>
          </div>
          {stats.operator.pendingJobs.length === 0 ? (
            <div className="card">
              <p className="text-muted text-sm">No jobs in queue</p>
            </div>
          ) : (
            <div>
              {stats.operator.pendingJobs.map((order) => (
                <JobCard key={order.id} order={order} department={department!} />
              ))}
            </div>
          )}
        </div>
      )}

      {role === "SALES" && stats.sales && (
        <div className="grid-2 mb-24">
          <div className="stat-card green">
            <div className="stat-label">Completed Orders</div>
            <div className="stat-value">{stats.sales.completedOrders.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Available Products</div>
            <div className="stat-value">{stats.sales.availableInventory.length}</div>
            <Link href="/inventory" className="stat-sub hover:underline">
              View inventory →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = "" }: { label: string; value: number; color?: "" | "amber" | "teal" | "purple" | "red" | "green" }) {
  // Mockup CSS mapping
  const colorMap: Record<string, string> = {
    "": "",
    "amber": "amber",
    "teal": "teal",
    "purple": "purple",
    "red": "red",
    "green": "teal", // green bar not explicitly defined in css::before, using teal or just plain
  };
  return (
    <div className={`stat-card ${colorMap[color] || ""}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function JobCard({ order }: { order: { id: string; design: { name: string; stages: { sequence: number; name: string }[] }; currentStage: number; targetKg: number; quantity: number }; department: string }) {
  const currentStage = order.design.stages.find((s) => s.sequence === order.currentStage);
  
  return (
    <div className="job-card inprog" style={{ marginBottom: "10px" }}>
      <Link href={`/jobs/${order.id}`} className="block">
        <div className="job-header">
          <span className="job-id">{order.id.slice(0, 8)} · Stage {order.currentStage}/{order.design.stages.length}</span>
          <span className="badge badge-amber">In progress</span>
        </div>
        <div className="job-design">{order.design.name} — {currentStage?.name || "Unknown"}</div>
        <div className="job-meta" style={{ marginTop: "8px" }}>
          <span>Target: <span className="job-kg">{order.targetKg} kg</span></span>
          <span>Qty: {order.quantity} units</span>
        </div>
      </Link>
    </div>
  );
}