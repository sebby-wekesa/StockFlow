import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { approveProductionOrder, rejectProductionOrder } from "@/actions/production-order";

export default async function ApprovalsPage() {
  const pendingOrders = await prisma.productionOrder.findMany({
    where: { status: "PENDING" },
    include: { design: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">Pending Approvals</h1>

      {pendingOrders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-zinc-200">
          <p className="text-zinc-500">No orders pending approval</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white p-6 rounded-lg border border-zinc-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-900">{order.design.name}</h3>
                  <p className="text-sm text-zinc-500 mt-1">
                    Order #{order.id.slice(0, 8)} | Created {order.createdAt.toLocaleDateString()}
                  </p>
                  <div className="mt-3 flex gap-4 text-sm">
                    <span className="text-zinc-600">Quantity: {order.quantity}</span>
                    <span className="text-zinc-600">Target: {order.targetKg} kg</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <form action={async () => {
                    "use server";
                    await approveProductionOrder(order.id);
                  }}>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={async () => {
                    "use server";
                    await rejectProductionOrder(order.id);
                  }}>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-zinc-300 text-zinc-700 text-sm font-medium rounded-md hover:bg-zinc-50"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}