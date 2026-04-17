"use server";

import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek, startOfDay } from "date-fns";

export async function getDashboardStats() {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const todayStart = startOfDay(now);

  // 1. Raw Material Stock
  const materials = await prisma.rawMaterial.findMany();
  const rawMaterialStock = materials.reduce((sum, m) => sum + m.availableKg + m.reservedKg, 0);
  const totalFree = materials.reduce((sum, m) => sum + m.availableKg, 0);

  // 2. Active Orders
  const activeOrdersCount = await prisma.productionOrder.count({
    where: {
      status: {
        in: ["APPROVED", "IN_PRODUCTION"],
      },
    },
  });
  const pendingApprovalsCount = await prisma.productionOrder.count({
    where: {
      status: "PENDING",
    },
  });

  // 3. Finished Goods
  const finishedGoods = await prisma.finishedGoods.aggregate({
    _sum: {
      kgProduced: true,
      quantity: true,
    },
  });

  // 4. Scrap This Week
  const weeklyLogs = await prisma.stageLog.findMany({
    where: {
      completedAt: {
        gte: weekStart,
      },
    },
  });
  const scrapThisWeek = weeklyLogs.reduce((sum, log) => sum + log.kgScrap, 0);

  // 5. Recent Orders
  const recentOrders = await prisma.productionOrder.findMany({
    take: 4,
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      design: true,
    },
  });

  // 6. Department Metrics (Scrap & Throughput)
  const todayLogs = await prisma.stageLog.findMany({
    where: {
      completedAt: {
        gte: todayStart,
      },
    },
  });

  // Group weekly logs by dept for scrap chart
  const deptScrapMap: Record<string, number> = {};
  weeklyLogs.forEach(log => {
    const dept = log.department || "Unknown";
    deptScrapMap[dept] = (deptScrapMap[dept] || 0) + log.kgScrap;
  });

  const departmentScrap = Object.entries(deptScrapMap).map(([dept, kg]) => {
    const totalScrap = weeklyLogs.reduce((sum, l) => sum + l.kgScrap, 0);
    const pct = totalScrap > 0 ? Math.round((kg / totalScrap) * 100) : 0;
    return { dept, kg, pct };
  });

  // Group today's logs for throughput
  const throughputMap: Record<string, any> = {};
  todayLogs.forEach(log => {
    const dept = log.department || "Unknown";
    if (!throughputMap[dept]) {
      throughputMap[dept] = { dept, jobs: new Set(), kg: 0, scrap: 0, ops: new Set() };
    }
    throughputMap[dept].jobs.add(log.orderId);
    throughputMap[dept].kg += log.kgOut;
    throughputMap[dept].scrap += log.kgScrap;
    throughputMap[dept].ops.add(log.operatorId);
  });

  const throughput = Object.entries(throughputMap).map(([dept, data]) => {
    const totalProcessed = data.kg + data.scrap;
    const yield_pct = totalProcessed > 0 ? (data.kg / totalProcessed) * 100 : 0;
    return {
      dept,
      jobs: data.jobs.size,
      kg: data.kg,
      scrap: data.scrap,
      yield: parseFloat(yield_pct.toFixed(1)),
      ops: data.ops.size,
    };
  });

  return {
    rawMaterialStock,
    totalFree,
    activeOrders: activeOrdersCount,
    pendingApprovals: pendingApprovalsCount,
    finishedGoodsKg: finishedGoods._sum.kgProduced || 0,
    finishedGoodsUnits: finishedGoods._sum.quantity || 0,
    scrapThisWeek,
    recentOrders: recentOrders.map(o => ({
      id: o.orderNumber,
      design: o.design.name,
      kg: o.targetKg,
      status: o.status === "PENDING" ? "Pending approval" : 
              o.status === "APPROVED" || o.status === "IN_PRODUCTION" ? "In production" : "Complete",
      dept: o.currentDept,
    })),
    departmentScrap,
    throughput,
  };
}
