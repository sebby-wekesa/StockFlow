import { prisma } from "@/lib/prisma";
import { PackagingQueue } from "@/components/PackagingQueue";

async function getCompletedOrders() {
  const orders = await prisma.productionOrder.findMany({
    where: { status: 'COMPLETED' },
    include: {
      design: {
        select: {
          name: true,
          code: true,
          targetWeight: true
        }
      },
      logs: {
        select: { kgOut: true },
        orderBy: { completedAt: 'desc' },
        take: 1
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return orders.map(order => ({
    id: order.id,
    orderNumber: order.orderNumber,
    designName: order.design.name,
    designCode: order.design.code,
    quantity: order.quantity,
    finalKg: order.logs[0]?.kgOut || 0,
    completedAt: order.updatedAt
  }));
}

export default async function PackagingPage() {
  const orders = await getCompletedOrders();

  return (
    <div className="p-8 bg-[#0f1113] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Packaging Queue</h1>
      </div>
      <PackagingQueue orders={orders} />
    </div>
  );
}