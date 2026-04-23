import { prisma } from "@/lib/prisma";
import ApprovalTable from "./ApprovalTable";
import { requireRole } from "@/lib/auth";

export default async function OrderApprovalPage() {
  await requireRole('ADMIN', 'MANAGER');

  const pendingOrders = await prisma.productionOrder.findMany({
    where: { status: "PENDING" },
    include: {
      design: true,
      branch: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Order Approvals</h1>
        <p className="text-gray-400">Review and approve incoming stock orders.</p>
      </div>

      {pendingOrders.length === 0 ? (
        <div className="bg-[#1e1e1e] p-10 text-center rounded-lg border border-gray-800">
          <p className="text-gray-500">No orders awaiting approval.</p>
        </div>
      ) : (
        <ApprovalTable orders={JSON.parse(JSON.stringify(pendingOrders))} />
      )}
    </div>
  );
}