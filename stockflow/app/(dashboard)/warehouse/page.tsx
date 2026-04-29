import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Truck, TrendingUp, AlertTriangle, CheckCircle, Clock } from "lucide-react";

async function getWarehouseStats() {
  const totalRawMaterials = await prisma.rawMaterial.count();
  const lowStockItems = await prisma.rawMaterial.count({
    where: { quantity: { lt: 50 } }
  });

  const recentDeliveries = await prisma.rawMaterialDelivery.count({
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
  return await prisma.rawMaterialDelivery.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      rawMaterial: {
        select: { name: true, unit: true }
      }
    }
  });
}

async function getLowStockAlerts() {
  return await prisma.rawMaterial.findMany({
    where: { quantity: { lt: 50 } },
    select: {
      id: true,
      name: true,
      quantity: true,
      unit: true,
      minQuantity: true
    },
    orderBy: { quantity: "asc" }
  });
}

export default async function WarehousePage() {
  const [stats, recentDeliveries, lowStockAlerts] = await Promise.all([
    getWarehouseStats(),
    getRecentDeliveries(),
    getLowStockAlerts()
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="section-header mb-8">
        <div>
          <h1 className="section-title">Warehouse Dashboard</h1>
          <p className="section-sub">Manage inventory, track deliveries, and monitor stock levels</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-[#f0c040] hover:bg-[#f5d060] text-black">
            <Truck className="h-4 w-4 mr-2" />
            Receive Stock
          </Button>
          <Button variant="outline">
            <Package className="h-4 w-4 mr-2" />
            View Inventory
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#4a9eff]/10 rounded-lg">
                <Package className="h-6 w-6 text-[#4a9eff]" />
              </div>
              <div>
                <p className="text-sm text-[#7a8090]">Total Materials</p>
                <p className="text-2xl font-bold text-[#e8eaed]">{stats.totalRawMaterials}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#e05555]/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-[#e05555]" />
              </div>
              <div>
                <p className="text-sm text-[#7a8090]">Low Stock Alerts</p>
                <p className="text-2xl font-bold text-[#e8eaed]">{stats.lowStockItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#2ec4a0]/10 rounded-lg">
                <Truck className="h-6 w-6 text-[#2ec4a0]" />
              </div>
              <div>
                <p className="text-sm text-[#7a8090]">Recent Deliveries</p>
                <p className="text-2xl font-bold text-[#e8eaed]">{stats.recentDeliveries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#f0c040]/10 rounded-lg">
                <Clock className="h-6 w-6 text-[#f0c040]" />
              </div>
              <div>
                <p className="text-sm text-[#7a8090]">Pending Orders</p>
                <p className="text-2xl font-bold text-[#e8eaed]">{stats.pendingOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#e05555]" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>
              Materials that need attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockAlerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-[#2ec4a0] mx-auto mb-4" />
                <p className="text-[#7a8090]">All materials are well stocked!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockAlerts.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-[#1e2023] rounded-lg border border-[#2a2d32]">
                    <div>
                      <p className="font-medium text-[#e8eaed]">{item.name}</p>
                      <p className="text-sm text-[#7a8090]">
                        Min: {item.minQuantity} {item.unit}
                      </p>
                    </div>
                    <Badge variant="destructive">
                      {item.quantity} {item.unit}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Deliveries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-[#2ec4a0]" />
              Recent Deliveries
            </CardTitle>
            <CardDescription>
              Latest stock received
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentDeliveries.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="h-12 w-12 text-[#7a8090] mx-auto mb-4" />
                <p className="text-[#7a8090]">No recent deliveries</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentDeliveries.map((delivery) => (
                  <div key={delivery.id} className="flex items-center justify-between p-3 bg-[#1e2023] rounded-lg border border-[#2a2d32]">
                    <div>
                      <p className="font-medium text-[#e8eaed]">{delivery.rawMaterial.name}</p>
                      <p className="text-sm text-[#7a8090]">
                        {new Date(delivery.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {delivery.quantity} {delivery.rawMaterial.unit}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}