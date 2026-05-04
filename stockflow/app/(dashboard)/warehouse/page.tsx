import { prisma } from "@/lib/prisma";
import { Package, Truck, AlertTriangle, CheckCircle, Clock } from "lucide-react";

const LOW_STOCK_THRESHOLD = 50;

type RecentDelivery = Awaited<ReturnType<typeof getRecentDeliveries>>[number];
type LowStockItem = Awaited<ReturnType<typeof getLowStockAlerts>>[number];

async function getWarehouseStats() {
  const totalRawMaterials = await prisma.rawMaterial.count();
  const lowStockItems = await prisma.rawMaterial.count({
    where: { availableKg: { lt: LOW_STOCK_THRESHOLD } }
  });

  const recentDeliveries = await prisma.materialReceipt.count({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    }
  });

  const pendingOrders = await prisma.productionOrder.count({
    where: { status: "PENDING" }
  });

  return {
    totalRawMaterials,
    lowStockItems,
    recentDeliveries,
    pendingOrders
  };
}

async function getRecentDeliveries() {
  return await prisma.materialReceipt.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      material: {
        select: { materialName: true, diameter: true }
      }
    }
  });
}

async function getLowStockAlerts() {
  return await prisma.rawMaterial.findMany({
    where: { availableKg: { lt: LOW_STOCK_THRESHOLD } },
    select: {
      id: true,
      materialName: true,
      diameter: true,
      availableKg: true,
    },
    orderBy: { availableKg: "asc" }
  });
}

export default async function WarehousePage() {
  const [stats, recentDeliveries, lowStockAlerts] = await Promise.all([
    getWarehouseStats(),
    getRecentDeliveries(),
    getLowStockAlerts()
  ]);

  return (
    <div>
      {/* Header */}
      <div className="section-header mb-16">
        <div>
          <div className="section-title">Warehouse Dashboard</div>
          <div className="section-sub">Manage inventory, track deliveries, and monitor stock levels</div>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-primary">
            <Truck className="h-4 w-4 mr-2" />
            Receive Stock
          </button>
          <button className="btn btn-ghost">
            <Package className="h-4 w-4 mr-2" />
            View Inventory
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-label">Total Materials</div>
          <div className="stat-value">{stats.totalRawMaterials}</div>
          <div className="stat-sub">Active inventory</div>
        </div>

        <div className="stat-card red">
          <div className="stat-label">Low Stock Alerts</div>
          <div className="stat-value">{stats.lowStockItems}</div>
          <div className="stat-sub">Need attention</div>
        </div>

        <div className="stat-card teal">
          <div className="stat-label">Recent Deliveries</div>
          <div className="stat-value">{stats.recentDeliveries}</div>
          <div className="stat-sub">This week</div>
        </div>

        <div className="stat-card amber">
          <div className="stat-label">Pending Orders</div>
          <div className="stat-value">{stats.pendingOrders}</div>
          <div className="stat-sub">Awaiting stock</div>
        </div>
      </div>

      <div className="grid-2 mb-16">
        {/* Low Stock Alerts */}
        <div className="card">
          <div className="section-header mb-16">
            <div className="section-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <AlertTriangle className="h-5 w-5" style={{color: 'var(--red)'}} />
              Low Stock Alerts
            </div>
            <div className="section-sub">Materials that need attention</div>
          </div>
          {lowStockAlerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto mb-4" style={{color: 'var(--teal)'}} />
              <p style={{color: 'var(--muted)'}}>All materials are well stocked!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockAlerts.map((item: LowStockItem) => (
                <div key={item.id} className="flex items-center justify-between p-3" style={{background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                  <div>
                    <p className="font-medium" style={{color: 'var(--text)'}}>{item.materialName}</p>
                    <p className="text-sm" style={{color: 'var(--muted)'}}>
                      Size: {item.diameter}
                    </p>
                  </div>
                  <span className="badge badge-red">
                    {item.availableKg.toString()} kg
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Deliveries */}
        <div className="card">
          <div className="section-header mb-16">
            <div className="section-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Truck className="h-5 w-5" style={{color: 'var(--teal)'}} />
              Recent Deliveries
            </div>
            <div className="section-sub">Latest stock received</div>
          </div>
          {recentDeliveries.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 mx-auto mb-4" style={{color: 'var(--muted)'}} />
              <p style={{color: 'var(--muted)'}}>No recent deliveries</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDeliveries.map((delivery: RecentDelivery) => (
                <div key={delivery.id} className="flex items-center justify-between p-3" style={{background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                  <div>
                    <p className="font-medium" style={{color: 'var(--text)'}}>{delivery.material.materialName}</p>
                    <p className="text-sm" style={{color: 'var(--muted)'}}>
                      {new Date(delivery.createdAt).toLocaleDateString()} · {delivery.material.diameter}
                    </p>
                  </div>
                  <span className="badge badge-muted">
                    {delivery.kgReceived.toString()} kg
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
