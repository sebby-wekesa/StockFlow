"use client";
import { useState, useEffect } from 'react';

export default function OperatorQueuePage() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    // Mock data for queue
    setQueue([
      { id: 1, name: 'Order 1', status: 'Pending' },
      { id: 2, name: 'Order 2', status: 'In Progress' },
    ]);
  }, []);

  return (
    <div>
      <h1>Operator Queue</h1>
      <ul>
        {queue.map(item => (
          <li key={item.id}>{item.name} - {item.status}</li>
        ))}
      </ul>
    </div>
  );
}