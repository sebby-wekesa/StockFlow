import { prisma } from "@/lib/prisma";
import { approveProductionOrder, rejectProductionOrder } from "@/actions/production-order";

export default async function ApprovalsPage() {
  const pendingOrders = await prisma.productionOrder.findMany({
    where: { status: "PENDING" },
    include: { design: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="section-header mb-16">
        <div>
          <div className="section-title">Order approvals</div>
          <div className="section-sub">Review specifications and release to production</div>
        </div>
      </div>

      {pendingOrders.length === 0 ? (
        <div className="card text-center">
          <p className="text-muted text-sm">No orders pending approval</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingOrders.map((order) => (
            <div key={order.id} className="approval-card">
              <div className="approval-header">
                <div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted)" }}>
                    #{order.id.slice(0, 8)}
                  </span>
                  <div style={{ fontFamily: "var(--font-head)", fontSize: "16px", fontWeight: "700", margin: "4px 0" }}>
                    {order.design.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    Created {order.createdAt.toLocaleDateString()}
                  </div>
                </div>
                <span className="badge badge-amber">Pending approval</span>
              </div>
              <div className="grid-2" style={{ gap: "10px", marginBottom: "2px" }}>
                <div className="card-sm">
                  <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Quantity</div>
                  <div style={{ fontWeight: 600, marginTop: "3px" }}>{order.quantity} units</div>
                </div>
                <div className="card-sm">
                  <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Target Kg</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, marginTop: "3px", color: "var(--accent)" }}>{order.targetKg} kg</div>
                </div>
              </div>
              <div className="approval-actions">
                <form action={async () => {
                  "use server";
                  await approveProductionOrder(order.id);
                }}>
                  <button type="submit" className="btn btn-teal">
                    Approve & release
                  </button>
                </form>
                <form action={async () => {
                  "use server";
                  await rejectProductionOrder(order.id);
                }} style={{ marginLeft: "auto" }}>
                  <button type="submit" className="btn btn-red btn-sm">
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}