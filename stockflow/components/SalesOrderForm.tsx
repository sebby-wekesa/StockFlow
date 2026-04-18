"use client";

import { useState } from "react";

interface StockItem {
  id: string;
  quantity: number;
  design: {
    name: string;
    code: string;
    kgPerUnit: number;
  };
}

interface SalesOrderFormProps {
  stock: StockItem[];
}

export function SalesOrderForm({ stock }: SalesOrderFormProps) {
  const [customerName, setCustomerName] = useState("");
  const [selectedItems, setSelectedItems] = useState<{ stockId: string; quantity: number }[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement order creation
    alert("Order creation not implemented yet");
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">Customer Name</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300">Select Items</label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {stock.map((item) => (
              <div key={item.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedItems([...selectedItems, { stockId: item.id, quantity: 1 }]);
                    } else {
                      setSelectedItems(selectedItems.filter(s => s.stockId !== item.id));
                    }
                  }}
                />
                <span className="text-white">
                  {item.design.name} ({item.quantity} available)
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          Create Sales Order
        </button>
      </form>
    </div>
  );
}