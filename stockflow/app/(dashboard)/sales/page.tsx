import { prisma } from "@/lib/prisma";
import { SalesCatalogue } from "@/components/sales/SalesCatalogue";

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
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white font-head tracking-tight">
            Sales Catalogue
          </h1>
          <p className="text-muted mt-2 text-sm">
            Manage your product inventory and sales operations
          </p>
        </div>

        {/* Stats Cards */}
        <div className="flex gap-4">
          <div className="stat-card teal">
            <div className="stat-label">Total Products</div>
            <div className="stat-value">{stats.totalProducts}</div>
            <div className="stat-sub">Available for sale</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-label">Total Stock</div>
            <div className="stat-value">{stats.totalStock.toLocaleString()}</div>
            <div className="stat-sub">Units in inventory</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-label">Total Weight</div>
            <div className="stat-value">{stats.totalKgProduced.toLocaleString()}</div>
            <div className="stat-sub">Kg produced</div>
          </div>
        </div>
      </div>

      {/* Catalogue Component */}
      <SalesCatalogue products={stock} />
    </div>
  );
}