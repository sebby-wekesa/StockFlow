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
    <main className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-surface to-surface2 border border-border rounded-2xl p-8">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-accent/10 rounded-xl">
                <Package className="text-accent" size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white font-head tracking-tight">
                  Sales Catalogue
                </h1>
                <p className="text-muted mt-1 text-sm">
                  Browse and manage your product inventory for sales operations
                </p>
              </div>
            </div>
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 xl:min-w-[400px]">
            <div className="bg-surface border border-border rounded-xl p-5 hover:border-teal/30 transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-teal/10 rounded-lg">
                  <Package className="text-teal" size={16} />
                </div>
                <span className="text-xs text-muted uppercase tracking-wider">Products</span>
              </div>
              <div className="text-2xl font-bold font-head text-teal mb-1">
                {stats.totalProducts.toLocaleString()}
              </div>
              <div className="text-xs text-muted">Available for sale</div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-5 hover:border-blue/30 transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue/10 rounded-lg">
                  <TrendingUp className="text-blue" size={16} />
                </div>
                <span className="text-xs text-muted uppercase tracking-wider">Stock</span>
              </div>
              <div className="text-2xl font-bold font-head text-blue mb-1">
                {stats.totalStock.toLocaleString()}
              </div>
              <div className="text-xs text-muted">Units in inventory</div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-5 hover:border-purple/30 transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple/10 rounded-lg">
                  <DollarSign className="text-purple" size={16} />
                </div>
                <span className="text-xs text-muted uppercase tracking-wider">Weight</span>
              </div>
              <div className="text-2xl font-bold font-head text-purple mb-1">
                {stats.totalKgProduced.toLocaleString()}
              </div>
              <div className="text-xs text-muted">Kg produced</div>
            </div>
          </div>
        </div>
      </div>

      {/* Catalogue Component */}
      <SalesCatalogue products={stock} />
    </main>
  );
}