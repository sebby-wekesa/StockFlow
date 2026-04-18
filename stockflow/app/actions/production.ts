"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function getOperatorQueue() {
  const user = await requireAuth();
  
  // If user is ADMIN or MANAGER, they see all queues. 
  // If OPERATOR, they see their department's queue.
  const department = user.department;
  
  const orders = await prisma.productionOrder.findMany({
    where: {
      status: "IN_PRODUCTION",
      ...(user.role === "OPERATOR" && department ? { currentDept: department } : {}),
    },
    include: {
      design: {
        include: {
          stages: {
            orderBy: {
              sequence: "asc",
            },
          },
        },
      },
    },
    orderBy: {
      priority: "desc",
    },
  });

  return orders.map(o => ({
    id: o.id,
    orderNumber: o.orderNumber,
    designName: o.design.name,
    currentStage: o.currentStage,
    totalStages: o.design.stages.length,
    priority: o.priority,
    targetKg: o.targetKg,
    // Add logic to get the current stage target dims or specific work
    workDescription: o.design.stages.find(s => s.sequence === o.currentStage)?.name || "Production",
    inheritedKg: o.targetKg, // Simplified for now
  }));
}

export async function getOperatorHistory() {
  const user = await requireAuth();

  const logs = await prisma.stageLog.findMany({
    where: {
      operatorId: user.id,
    },
    include: {
      order: {
        include: {
          design: true,
        },
      },
    },
    orderBy: {
      completedAt: "desc",
    },
    take: 20, // Last 20 completed jobs
  });

  return logs.map(log => ({
    id: log.id,
    orderNumber: log.order.orderNumber,
    designName: log.order.design.name,
    completedAt: log.completedAt,
    kgOut: log.kgOut,
    kgScrap: log.kgScrap,
    department: log.department,
    stageName: log.stageName,
  }));
}

export async function getOrderForLogging(id: string) {
  const order = await prisma.productionOrder.findUnique({
    where: { id },
    include: {
      design: {
        include: {
          stages: {
            orderBy: {
              sequence: "asc",
            },
          },
        },
      },
      logs: {
        orderBy: {
          sequence: "desc",
        },
        take: 1,
      },
    },
  });

  if (!order) throw new Error("Order not found");

  // Determine inheritedKg (from previous stage log or targetKg if first stage)
  const inheritedKg = order.logs.length > 0 ? order.logs[0].kgOut : order.targetKg;

  return {
    ...order,
    inheritedKg,
  };
}
