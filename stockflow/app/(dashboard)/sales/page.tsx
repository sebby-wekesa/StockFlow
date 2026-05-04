import { prisma } from "@/lib/prisma";
import { SalesCatalogue } from "@/components/sales/SalesCatalogue";
import { Package, TrendingUp, DollarSign } from "lucide-react";

async function getAvailableStock() {
  // Fetch finished goods with available quantity
  const stock = await prisma.finishedGoods.findMany({
    where: { quantity: { gt: 0 } },
    include: {
      design: {
        select: {
          name: true,
          code: true,
          description: true,
          targetWeight: true
        }
      }
    }
  });

  return stock.map(item => ({
    id: item.id,
    name: item.design.name,
    description: item.design.description,
    stock: item.quantity,
    unitWeight: item.design.targetWeight?.toNumber() || 0,
    kgProduced: item.kgProduced.toNumber(),
    code: item.design.code
  }));
}

async function getSalesStats() {
  const totalProducts = await prisma.finishedGoods.count({
    where: { quantity: { gt: 0 } }
  });

  const totalStock = await prisma.finishedGoods.aggregate({
    where: { quantity: { gt: 0 } },
    _sum: { quantity: true }
  });

  const totalValue = await prisma.finishedGoods.aggregate({
    where: { quantity: { gt: 0 } },
    _sum: { kgProduced: true }
  });

  return {
    totalProducts,
    totalStock: totalStock._sum.quantity || 0,
    totalKgProduced: totalValue._sum.kgProduced?.toNumber() || 0
  };
}

export default async function SalesPage() {
  const [stock, stats] = await Promise.all([
    getAvailableStock(),
    getSalesStats()
  ]);

  return (
    <div className="dashboard-content">
      <h1>Sales Catalogue</h1>

      <div className="stats-grid">
        <div className="stat-card teal">
          <div className="stat-label">Available Products</div>
          <div className="stat-value">{stats.totalProducts}</div>
          <div className="stat-sub">For sale</div>
        </div>

        <div className="stat-card blue">
          <div className="stat-label">Total Stock</div>
          <div className="stat-value">{stats.totalStock}</div>
          <div className="stat-sub">Units available</div>
        </div>

        <div className="stat-card purple">
          <div className="stat-label">Total Weight</div>
          <div className="stat-value">{stats.totalKgProduced.toFixed(1)}</div>
          <div className="stat-sub">Kg produced</div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <div className="section-title">Product Catalogue</div>
            <div className="section-sub">Browse and manage your product inventory</div>
          </div>
        </div>

        <SalesCatalogue products={stock} />
      </div>
    </div>
  );
}