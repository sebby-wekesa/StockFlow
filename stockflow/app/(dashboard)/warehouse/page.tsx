"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Package, Truck, AlertTriangle, CheckCircle } from "lucide-react";

interface WarehouseStats {
  totalRawMaterials: number;
  lowStockItems: number;
  recentDeliveries: number;
  pendingOrders: number;
}

interface RecentDelivery {
  id: string;
  material: {
    materialName: string;
    diameter: string;
  };
  kgReceived: number;
  createdAt: string;
}

interface LowStockItem {
  id: string;
  materialName: string;
  diameter: string;
  availableKg: number;
}

export default function WarehousePage() {
  const router = useRouter();
  const [stats, setStats] = useState<WarehouseStats>({
    totalRawMaterials: 0,
    lowStockItems: 0,
    recentDeliveries: 0,
    pendingOrders: 0
  });
  const [recentDeliveries, setRecentDeliveries] = useState<RecentDelivery[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWarehouseData = async () => {
      try {
        // Fetch stats
        const statsResponse = await fetch('/api/warehouse/stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }

        // Fetch recent deliveries
        const deliveriesResponse = await fetch('/api/warehouse/recent-deliveries');
        if (deliveriesResponse.ok) {
          const deliveriesData = await deliveriesResponse.json();
          setRecentDeliveries(deliveriesData);
        }

        // Fetch low stock alerts
        const lowStockResponse = await fetch('/api/warehouse/low-stock');
        if (lowStockResponse.ok) {
          const lowStockData = await lowStockResponse.json();
          setLowStockAlerts(lowStockData);
        }
      } catch (error) {
        console.error('Error fetching warehouse data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWarehouseData();
  }, []);

  const handleReceiveStock = () => {
    router.push('/receive');
  };

  const handleViewInventory = () => {
    router.push('/rawmaterials');
  };

  return (
    <div className="dashboard-content">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1>Warehouse Dashboard</h1>
          <div className="section-sub">Manage inventory, track deliveries, and monitor stock levels</div>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-primary" onClick={handleReceiveStock}>
            <Truck className="h-4 w-4 mr-2" />
            Receive Stock
          </button>
          <button className="btn btn-ghost" onClick={handleViewInventory}>
            <Package className="h-4 w-4 mr-2" />
            View Inventory
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-label">Total Materials</div>
          <div className="stat-value">{isLoading ? '...' : stats.totalRawMaterials}</div>
          <div className="stat-sub">Active inventory</div>
        </div>

        <div className="stat-card red">
          <div className="stat-label">Low Stock Alerts</div>
          <div className="stat-value">{isLoading ? '...' : stats.lowStockItems}</div>
          <div className="stat-sub">Need attention</div>
        </div>

        <div className="stat-card teal">
          <div className="stat-label">Recent Deliveries</div>
          <div className="stat-value">{isLoading ? '...' : stats.recentDeliveries}</div>
          <div className="stat-sub">This week</div>
        </div>

        <div className="stat-card amber">
          <div className="stat-label">Pending Orders</div>
          <div className="stat-value">{isLoading ? '...' : stats.pendingOrders}</div>
          <div className="stat-sub">Awaiting stock</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
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
              {lowStockAlerts.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3" style={{background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                  <div>
                    <p className="font-medium" style={{color: 'var(--text)'}}>{item.materialName}</p>
                    <p className="text-sm" style={{color: 'var(--muted)'}}>
                      Size: {item.diameter}
                    </p>
                  </div>
                  <span className="badge badge-red">
                    {item.availableKg} kg
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
              {recentDeliveries.map((delivery) => (
                <div key={delivery.id} className="flex items-center justify-between p-3" style={{background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                  <div>
                    <p className="font-medium" style={{color: 'var(--text)'}}>{delivery.material.materialName}</p>
                    <p className="text-sm" style={{color: 'var(--muted)'}}>
                      {new Date(delivery.createdAt).toLocaleDateString()} · {delivery.material.diameter}
                    </p>
                  </div>
                  <span className="badge badge-muted">
                    {delivery.kgReceived} kg
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
