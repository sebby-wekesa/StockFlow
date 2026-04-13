import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import Link from "next/link";

export default async function JobsPage() {
  const user = await getUser();
  if (!user || user.role !== "OPERATOR") redirect("/dashboard");

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
  });

  const department = dbUser?.department;

  const pendingJobs = await prisma.productionOrder.findMany({
    where: { status: "IN_PRODUCTION" },
    include: {
      design: { include: { stages: { orderBy: { sequence: "asc" } } } },
      logs: { orderBy: { sequence: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Since we don't have department strict filtering yet in schema stages, we show all IN_PRODUCTION.
  // In a real app we'd filter jobs where the currentStage matches the operator's department.

  return (
    <div className="space-y-6">
      <div className="section-header mb-16">
        <div>
          <div className="section-title">Active Jobs</div>
          <div className="section-sub">Production orders currently in progress</div>
        </div>
      </div>

      {pendingJobs.length === 0 ? (
        <div className="card">
          <p className="text-muted text-sm">No active jobs in production.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingJobs.map((order) => {
            const currentStage = order.design.stages.find((s) => s.sequence === order.currentStage);
            
            return (
              <div
                key={order.id}
                className="job-card inprog"
              >
                <Link href={`/jobs/${order.id}`} className="block">
                  <div className="job-header">
                    <span className="job-id">
                      {order.id.slice(0, 8)} · Stage {order.currentStage}/{order.design.stages.length}
                    </span>
                    <span className="badge badge-amber">In progress</span>
                  </div>
                  <div className="job-design">
                    {order.design.name} — {currentStage?.name || "Unknown"}
                  </div>
                  <div className="job-meta" style={{ marginTop: "8px" }}>
                    <span>
                      Target target: <span className="job-kg">{order.targetKg} kg</span>
                    </span>
                    <span>
                      Quantity: {order.quantity} units
                    </span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
