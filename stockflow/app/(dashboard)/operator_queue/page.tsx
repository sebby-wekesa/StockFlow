"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOperatorQueue } from "@/app/actions/production";

const mockJobs = [
  {
    id: 'PO-0040',
    design: 'Stud rod 8mm',
    work: 'Cut to 120mm',
    received: 85,
    dims: '8mm × 120mm',
    client: 'BuildPro Ltd',
    urgent: true,
    inProgress: false
  },
  {
    id: 'PO-0039',
    design: 'Anchor bolt',
    work: 'Cut to 170mm',
    received: 200,
    dims: '16mm × 170mm',
    client: 'Apex Hardware',
    urgent: false,
    inProgress: true
  },
  {
    id: 'PO-0045',
    design: 'Hex bolt M12',
    work: 'Cut to 70mm',
    received: 120,
    dims: '12mm × 70mm',
    client: 'Mech Supplies',
    urgent: false,
    inProgress: false
  }
];

export default function OperatorQueuePage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getOperatorQueue();
        setOrders(data.length > 0 ? data : mockJobs);
      } catch (e) {
        console.error(e);
        setOrders(mockJobs); // Fallback to mock data
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-8 text-[#7a8090] animate-pulse">Loading job queue...</div>;

  return (
    <div>
      <div className="section-header mb-16">
        <div>
          <div className="section-title">Cutting dept — job queue</div>
          <div className="section-sub">Jobs ready for your department</div>
        </div>
      </div>

      {orders.map((order, i) => (
        <div key={order.id || i} className={`job-card ${order.urgent ? 'urgent' : order.inProgress ? 'inprog' : ''}`} style={{cursor:'pointer'}} onClick={() => window.location.href = '/operator_log'}>
          <div className="job-header">
            <span className="job-id">{order.id} · Stage 1/3</span>
            <span className={`badge ${order.urgent ? 'badge-red' : order.inProgress ? 'badge-amber' : 'badge-muted'}`}>
              {order.urgent ? 'Urgent' : order.inProgress ? 'In progress' : 'Queued'}
            </span>
          </div>
          <div className="job-design">{order.design} — {order.work}</div>
          <div className="job-meta" style={{marginTop:'8px'}}>
            <span>Received: <span className="job-kg">{order.received} kg</span></span>
            <span>Target dims: {order.dims}</span>
            <span>Client: {order.client}</span>
          </div>
        </div>
      ))}
    </div>
  );
}