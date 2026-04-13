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
    PENDING: "badge-amber",
    APPROVED: "badge-blue",
    IN_PRODUCTION: "badge-purple",
    COMPLETED: "badge-green",
    CANCELLED: "badge-red",
  };

  return (
    <div className="space-y-6">
      <div className="section-header mb-16">
        <div>
          <div className="section-title">Production orders</div>
          <div className="section-sub">Manage and create new orders</div>
        </div>
      </div>

      <div className="card mb-24">
        <div className="section-header mb-16">
          <div className="section-title">New production order</div>
        </div>
        <form action={createProductionOrder}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Design</label>
              <select name="designId" required className="form-input">
                <option value="">Select Design</option>
                {designs.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input type="number" name="quantity" defaultValue={1} min={1} required className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Target (kg)</label>
              <input type="number" name="targetKg" step="0.01" required className="form-input" placeholder="0.00" />
            </div>
          </div>
          <div style={{ marginTop: "12px" }}>
            <button type="submit" className="btn btn-primary">Create order</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Design</th>
                <th>Qty</th>
                <th>Target Kg</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td><span style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}>#{order.id.slice(0, 8)}</span></td>
                  <td>{order.design.name}</td>
                  <td>{order.quantity}</td>
                  <td><span className="job-kg">{order.targetKg} kg</span></td>
                  <td>
                    <span className={`badge ${statusColors[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td><span style={{ color: "var(--muted)", fontSize: "12px" }}>{order.createdAt.toLocaleDateString()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}