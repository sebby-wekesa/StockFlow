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
    kgProduced: item.kgProduced.toNumber()
  }));
}

export default async function SalesPage() {
  const stock = await getAvailableStock();

  return (
    <div className="p-8 bg-[#0f1113] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Sales Catalogue</h1>
      </div>
      <SalesCatalogue products={stock} />
    </div>
  );
}