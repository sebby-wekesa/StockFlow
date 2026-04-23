"use client";

import { updateOrderStatus } from "@/app/actions/orders";
import { Check, X, Eye, Package } from "lucide-react";
import { useState } from "react";

export default function ApprovalTable({ orders }: { orders: any[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAction = async (id: string, status: "APPROVED" | "REJECTED") => {
    const confirmMsg = `Are you sure you want to ${status.toLowerCase()} this order?`;
    if (!window.confirm(confirmMsg)) return;

    setLoadingId(id);
    try {
      const result = await updateOrderStatus(id, status);
      if (!result.success) {
        alert(result.error);
      }
    } catch (err) {
      alert("An unexpected error occurred.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800 bg-[#1e1e1e]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#2a2a2a] text-gray-300 uppercase text-xs">
          <tr>
            <th className="px-6 py-4">Order #</th>
            <th className="px-6 py-4">Design / Product</th>
            <th className="px-6 py-4">Branch</th>
            <th className="px-6 py-4">Quantity</th>
            <th className="px-6 py-4">Target (kg)</th>
            <th className="px-6 py-4">Date</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-[#252525] transition-colors">
              <td className="px-6 py-4 font-medium text-white">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-gray-500" />
                  {order.orderNumber}
                </div>
              </td>
              <td className="px-6 py-4 text-gray-300">{order.design?.name}</td>
              <td className="px-6 py-4 text-gray-300">
                <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-md text-[10px] font-bold uppercase border border-blue-500/20">
                  {order.branch?.location || 'Mombasa'}
                </span>
              </td>
              <td className="px-6 py-4 text-gray-300">{order.quantity}</td>
              <td className="px-6 py-4 text-gray-300">{Number(order.targetKg).toFixed(2)} kg</td>
              <td className="px-6 py-4 text-gray-400">
                {new Date(order.createdAt).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 text-right space-x-2">
                <button 
                  onClick={() => handleAction(order.id, "APPROVED")}
                  disabled={loadingId === order.id}
                  className={`p-2 bg-green-600/10 text-green-500 rounded hover:bg-green-600 hover:text-white transition-all ${loadingId === order.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Approve"
                >
                  <Check size={18} />
                </button>
                <button 
                  onClick={() => handleAction(order.id, "REJECTED")}
                  disabled={loadingId === order.id}
                  className={`p-2 bg-red-600/10 text-red-500 rounded hover:bg-red-600 hover:text-white transition-all ${loadingId === order.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Reject"
                >
                  <X size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
