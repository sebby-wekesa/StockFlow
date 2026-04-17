import { prisma } from "@/lib/prisma";
import { SalesOrderForm } from "@/components/SalesOrderForm";
import { SalesOrderList } from "@/components/SalesOrderList";

async function getSaleOrders() {
  return await prisma.saleOrder.findMany({
    include: {
      items: {
        include: {
          finishedGoods: {
            include: {
              design: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

async function getAvailableStock() {
  return await prisma.finishedGoods.findMany({
    where: { quantity: { gt: 0 } },
    include: {
      design: {
        select: {
          name: true,
          code: true,
          targetWeight: true
        }
      }
    }
  });
}

export default async function SalesOrdersPage() {
  const [saleOrders, stock] = await Promise.all([
    getSaleOrders(),
    getAvailableStock()
  ]);

  // Transform the data to satisfy the 'StockItem' type
  const formattedStock = stock.map(item => ({
    ...item,
    design: {
      ...item.design,
      // Use the nullish coalescing operator (??) to provide a default
      targetWeight: item.design.targetWeight ?? 0
    }
  }));

  return (
    <div className="p-8 bg-[#0f1113] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Sales Orders</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Create New Order</h2>
          <SalesOrderForm stock={formattedStock} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Recent Orders</h2>
          <SalesOrderList orders={saleOrders} />
        </div>
      </div>
    </div>
  );
}