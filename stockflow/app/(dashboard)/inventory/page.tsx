import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

type DesignWithStages = {
  id: string;
  name: string;
  description: string | null;
  targetDimensions: string | null;
  stages: { sequence: number; name: string }[];
};

export default async function InventoryPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
  });

  if (!dbUser || (dbUser.role !== "SALES" && dbUser.role !== "ADMIN" && dbUser.role !== "MANAGER")) {
    redirect("/dashboard");
  }

  const completedOrders = await prisma.productionOrder.findMany({
    where: { status: "COMPLETED" },
    include: {
      design: {
        include: {
          stages: true,
          orders: {
            where: { status: "COMPLETED" },
            select: { quantity: true, targetKg: true },
          },
        },
      },
    },
  });

  const inventoryMap = new Map<string, { design: DesignWithStages; totalQty: number; totalKg: number }>();

  for (const order of completedOrders) {
    const existing = inventoryMap.get(order.designId);
    if (existing) {
      existing.totalQty += order.quantity;
      existing.totalKg += order.targetKg;
    } else {
      inventoryMap.set(order.designId, {
        design: order.design,
        totalQty: order.quantity,
        totalKg: order.targetKg,
      });
    }
  }

  const inventory = Array.from(inventoryMap.values());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Available Inventory</h1>
      </div>

      {inventory.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-zinc-200">
          <p className="text-zinc-500">No completed products in inventory</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {inventory.map((item) => (
            <div
              key={item.design.id}
              className="bg-white p-6 rounded-lg border border-zinc-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-900">{item.design.name}</h3>
                  {item.design.description && (
                    <p className="text-sm text-zinc-500 mt-1">{item.design.description}</p>
                  )}
                  {item.design.targetDimensions && (
                    <p className="text-sm text-zinc-500">Dimensions: {item.design.targetDimensions}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">{item.totalQty}</p>
                  <p className="text-xs text-zinc-500 uppercase">Units Available</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-200 flex gap-6 text-sm">
                <div>
                  <span className="text-zinc-500">Total Weight: </span>
                  <span className="font-medium text-zinc-900">{item.totalKg.toFixed(2)} kg</span>
                </div>
                <div>
                  <span className="text-zinc-500">Stages: </span>
                  <span className="font-medium text-zinc-900">{item.design.stages.length}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}