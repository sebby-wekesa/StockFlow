import { prisma } from "@/lib/prisma";
import { createProductionOrder } from "@/actions/production-order";

export default async function OrdersPage() {
  const orders = await prisma.productionOrder.findMany({
    include: { design: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const designs = await prisma.design.findMany({
    orderBy: { name: "asc" },
  });

  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    APPROVED: "bg-blue-100 text-blue-800",
    IN_PRODUCTION: "bg-purple-100 text-purple-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Production Orders</h1>
      </div>

      <div className="bg-white p-6 rounded-lg border border-zinc-200">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Create New Order</h2>
        <form action={createProductionOrder} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-700 mb-1">Design</label>
            <select
              name="designId"
              required
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-500"
            >
              <option value="">Select Design</option>
              {designs.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-zinc-700 mb-1">Quantity</label>
            <input
              type="number"
              name="quantity"
              defaultValue={1}
              min={1}
              required
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-zinc-700 mb-1">Target (kg)</label>
            <input
              type="number"
              name="targetKg"
              step="0.01"
              required
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-500"
              placeholder="0.00"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-800"
          >
            Create
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Order</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Design</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Qty</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Target Kg</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 text-sm font-mono text-zinc-600">#{order.id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-sm font-medium text-zinc-900">{order.design.name}</td>
                <td className="px-4 py-3 text-sm text-zinc-600">{order.quantity}</td>
                <td className="px-4 py-3 text-sm text-zinc-600">{order.targetKg}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-500">{order.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}