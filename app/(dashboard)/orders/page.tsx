"use client";
import { useState, useEffect } from 'react';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // Mock data for orders
    setOrders([
      { id: 1, product: 'Product A', quantity: 10 },
      { id: 2, product: 'Product B', quantity: 5 },
    ]);
  }, []);

  return (
    <div>
      <h1>Orders</h1>
      <ul>
        {orders.map(order => (
          <li key={order.id}>{order.product} - Qty: {order.quantity}</li>
        ))}
      </ul>
    </div>
  );
}