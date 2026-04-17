"use client";

interface Order {
  id: string;
  orderNumber: string;
  designName: string;
  designCode: string;
  quantity: number;
  finalKg: number;
  completedAt: Date;
}

interface PackagingQueueProps {
  orders: Order[];
}

export function PackagingQueue({ orders }: PackagingQueueProps) {
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-xl font-semibold text-white mb-4">Completed Production Orders</h2>
      {orders.length === 0 ? (
        <p className="text-gray-400">No completed orders ready for packaging.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-gray-700 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-white font-semibold">{order.designName}</h3>
                  <p className="text-gray-300">Order: {order.orderNumber}</p>
                  <p className="text-gray-300">Code: {order.designCode}</p>
                  <p className="text-gray-300">Quantity: {order.quantity}</p>
                  <p className="text-gray-300">Final Weight: {order.finalKg} kg</p>
                </div>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                  Mark as Packaged
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}