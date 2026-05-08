export const dynamic = 'force-dynamic';

import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";


async function getAdminStats() {
  const totalOrders = await prisma.productionOrder.count();
  const pendingOrders = await prisma.productionOrder.count({ where: { status: "PENDING" } });
  const inProduction = await prisma.productionOrder.count({ where: { status: "IN_PRODUCTION" } });
  const completed = await prisma.productionOrder.count({ where: { status: "COMPLETED" } });
  const designs = await prisma.design.count();

  // Count users from Prisma User table
  const users = await prisma.User.count();

  const inventory = await prisma.rawMaterial.findMany();

  // Calculate dashboard stats
  const rawMaterialStock = inventory.reduce(
    (sum, m) => sum + (m.availableKg?.toNumber() ?? 0) + (m.reservedKg?.toNumber() ?? 0),
    0
  );
  const totalFree = inventory.reduce(
    (sum, m) => sum + (m.availableKg?.toNumber() ?? 0),
    0
  );

  const activeOrdersCount = await prisma.productionOrder.count({
    where: { status: { in: ["APPROVED", "IN_PRODUCTION"] } },
  });
  const pendingApprovalsCount = pendingOrders;

  const finishedGoodsAgg = await prisma.finishedGoods.aggregate({
    _sum: {
      kgProduced: true,
      quantity: true,
    },
  });
  const finishedGoods = {
    _sum: {
      kgProduced: finishedGoodsAgg._sum.kgProduced?.toNumber() ?? 0,
      quantity: finishedGoodsAgg._sum.quantity ?? 0,
    }
  };

  // Scrap this week calculation (simplified)
  const scrapThisWeek = 0; // Would need more complex query

  // Recent orders
  const recentOrders = await prisma.productionOrder.findMany({
    take: 4,
    where: {},
    orderBy: { createdAt: "desc" },
    include: { Design: true },
  });

  // Department scrap (simplified)
  const departmentScrap = []; // Would need complex aggregation

  // Throughput (simplified)
  const throughput = []; // Would need complex aggregation

  return {
    totalOrders,
    pendingOrders,
    inProduction,
    completed,
    designs,
    users,
    inventory,
    rawMaterialStock,
    totalFree,
    activeOrdersCount,
    pendingApprovalsCount,
    finishedGoods,
    scrapThisWeek,
    recentOrders: recentOrders.map(o => ({
      id: o.orderNumber,
      design: o.Design.name,
      kg: o.targetKg?.toNumber() ?? 0,
      status: o.status === "PENDING" ? "Pending approval" :
              o.status === "APPROVED" || o.status === "IN_PRODUCTION" ? "In production" : "Complete",
      dept: o.currentDept,
    })),
    departmentScrap,
    throughput,
  };
}

export default async function AdminDashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/unauthorized");

  const stats = await getAdminStats();

  return (
    <div className="dashboard-content">
      <h1>Admin Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card amber">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{stats.totalOrders}</div>
          <div className="stat-sub">All production orders</div>
        </div>

        <div className="stat-card red">
          <div className="stat-label">Pending Orders</div>
          <div className="stat-value">{stats.pendingOrders}</div>
          <div className="stat-sub">Awaiting approval</div>
        </div>

        <div className="stat-card teal">
          <div className="stat-label">In Production</div>
          <div className="stat-value">{stats.inProduction}</div>
          <div className="stat-sub">Currently active</div>
        </div>

        <div className="stat-card purple">
          <div className="stat-label">Completed</div>
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-sub">Successfully finished</div>
        </div>

        <div className="stat-card amber">
          <div className="stat-label">Active Designs</div>
          <div className="stat-value">{stats.designs}</div>
          <div className="stat-sub">Available designs</div>
        </div>

        <div className="stat-card blue">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{stats.users || 0}</div>
          <div className="stat-sub">System users</div>
        </div>

        <div className="stat-card teal">
          <div className="stat-label">Raw Material Stock</div>
          <div className="stat-value">{stats.rawMaterialStock.toFixed(1)}</div>
          <div className="stat-sub">kg total inventory</div>
        </div>

        <div className="stat-card green">
          <div className="stat-label">Available Stock</div>
          <div className="stat-value">{stats.totalFree.toFixed(1)}</div>
          <div className="stat-sub">kg ready to use</div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <div className="section-title">Recent Orders</div>
            <div className="section-sub">Latest production orders</div>
          </div>
        </div>

        <div className="table-wrap">
          {stats.recentOrders.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Design</th>
                  <th>Target (kg)</th>
                  <th>Status</th>
                  <th>Department</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link
                        href={`/orders/${order.id}`}
                        style={{
                          color: 'var(--accent)',
                          textDecoration: 'none',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(240,192,64,0.1)',
                          border: '1px solid rgba(240,192,64,0.2)',
                          display: 'inline-block',
                          transition: 'all 0.15s',
                          fontSize: '12px',
                          fontWeight: 500,
                          fontFamily: 'var(--font-mono)'
                        }}
                        className="hover-accent"
                      >
                        {order.id}
                      </Link>
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--text)' }}>{order.design}</td>
                    <td style={{
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text)',
                      fontWeight: 500
                    }}>
                      {order.kg}
                    </td>
                    <td>
                      <span className={`badge ${
                        order.status === 'In production' ? 'badge-teal' :
                        order.status === 'Pending approval' ? 'badge-amber' :
                        order.status === 'Complete' ? 'badge-green' : 'badge-muted'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text)' }}>{order.dept}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--muted)'
            }}>
              <div style={{
                display: 'inline-block',
                marginBottom: '12px'
              }}>
                <div style={{
                  padding: '16px',
                  background: 'var(--surface2)',
                  border: '1px solid var(--border2)',
                  borderRadius: 'var(--radius)',
                  display: 'inline-block'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                  </svg>
                </div>
              </div>
              <p style={{
                fontSize: '14px',
                color: 'var(--muted)',
                margin: '0'
              }}>
                No recent orders
              </p>
              <p style={{
                fontSize: '12px',
                color: 'var(--muted)',
                marginTop: '4px'
              }}>
                New orders will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


