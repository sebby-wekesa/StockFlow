import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ProductionScheduler } from "@/components/admin/ProductionScheduler";

export default async function SchedulingPage() {
  await requireRole("ADMIN");

  // Fetch all production orders with their current status
  const orders = await prisma.productionOrder.findMany({
    include: {
      design: true,
      logs: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' }
    ]
  });

  // Transform for the scheduler component
  const schedulerData = orders.map(order => ({
    id: order.id,
    orderNumber: order.orderNumber,
    designName: order.design.name,
    status: order.status,
    priority: order.priority,
    quantity: order.quantity,
    currentStage: order.currentStage,
    currentDept: order.currentDept,
    estimatedCompletion: calculateEstimatedCompletion(order),
    createdAt: order.createdAt,
    targetKg: order.targetKg
  }));

  return (
    <div className="p-8 bg-[#0f1113] min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Production Scheduling</h1>
        <p className="text-[#7a8090]">Visualize and prioritize production orders across departments</p>
      </div>

      <ProductionScheduler initialOrders={schedulerData} />
    </div>
  );
}

function calculateEstimatedCompletion(order: any): Date | null {
  // Simple estimation based on stage count and current progress
  if (order.status === 'COMPLETED') return order.completedAt;

  if (order.status === 'IN_PRODUCTION') {
    // Estimate based on current stage and total stages
    const totalStages = order.design?.stages?.length || 1;
    const progressRatio = order.currentStage / totalStages;
    const avgDaysPerStage = 2; // Rough estimate
    const remainingDays = (totalStages - order.currentStage + 1) * avgDaysPerStage;

    return new Date(Date.now() + remainingDays * 24 * 60 * 60 * 1000);
  }

  // For pending orders, estimate based on queue position
  return null;
}