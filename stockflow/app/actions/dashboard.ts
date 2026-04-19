"use server";

import { startOfWeek, endOfWeek, startOfDay } from "date-fns";
import { requireAuth } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export async function getDashboardStats(user?: AuthUser) {
  const authUser = user || await requireAuth();
  const now = new Date();
  const weekStart = startOfWeek(now);
  const todayStart = startOfDay(now);

  // Role-based data filtering
  const isAdmin = authUser.role === "ADMIN";
  const isManager = authUser.role === "MANAGER";
  const isOperator = authUser.role === "OPERATOR";
  const isWarehouse = authUser.role === "WAREHOUSE";
  const isSales = authUser.role === "SALES";

  // 1. Raw Material Stock - Everyone can see, but Warehouse sees more detail
  const materials = await prisma.rawMaterial.findMany();
  const rawMaterialStock = materials.reduce((sum, m) => sum + m.availableKg + m.reservedKg, 0);
  const totalFree = materials.reduce((sum, m) => sum + m.availableKg, 0);

  // 2. Active Orders - Filter based on role
  let activeOrdersWhere: any = {};
  let pendingApprovalsWhere: any = {};

  if (isOperator) {
    // Operators only see orders in their department
    activeOrdersWhere = {
      status: { in: ["APPROVED", "IN_PRODUCTION"] },
      currentDept: authUser.department,
    };
    pendingApprovalsWhere = {
      status: "PENDING",
      // Operators don't see pending approvals
    };
  } else if (isWarehouse) {
    // Warehouse staff only see basic counts, no order details
    activeOrdersWhere = {};
    pendingApprovalsWhere = {};
  } else if (isSales) {
    // Sales see minimal production info
    activeOrdersWhere = {};
    pendingApprovalsWhere = {};
  } else {
    // Admin/Manager see all
    activeOrdersWhere = {
      status: { in: ["APPROVED", "IN_PRODUCTION"] },
    };
    pendingApprovalsWhere = {
      status: "PENDING",
    };
  }

  const activeOrdersCount = await prisma.productionOrder.count({
    where: activeOrdersWhere,
  });
  const pendingApprovalsCount = isOperator || isWarehouse || isSales ? 0 : await prisma.productionOrder.count({
    where: pendingApprovalsWhere,
  });

  // 3. Finished Goods - Everyone can see basic counts
  const finishedGoods = await prisma.finishedGoods.aggregate({
    _sum: {
      kgProduced: true,
      quantity: true,
    },
  });

  // 4. Scrap This Week - Only Admin/Manager see scrap data
  let scrapThisWeek = 0;
  if (isAdmin || isManager) {
    const weeklyLogs = await prisma.stageLog.findMany({
      where: {
        completedAt: {
          gte: weekStart,
        },
      },
    });
    scrapThisWeek = weeklyLogs.reduce((sum, log) => sum + log.kgScrap, 0);
  }

  // 5. Recent Orders - Filter based on role
  let recentOrdersWhere: any = {};
  if (isOperator) {
    recentOrdersWhere = {
      currentDept: authUser.department,
    };
  } else if (isWarehouse || isSales) {
    // Warehouse and Sales see limited or no order details
    recentOrdersWhere = {}; // Will return empty array below
  }

  const recentOrders = (isWarehouse || isSales) ? [] : await prisma.productionOrder.findMany({
    take: 4,
    where: recentOrdersWhere,
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      design: true,
    },
  });

  // 6. Department Metrics (Scrap & Throughput) - Only Admin/Manager see detailed metrics
  let departmentScrap: any[] = [];
  let throughput: any[] = [];

  if (isAdmin || isManager) {
    const weeklyLogs = await prisma.stageLog.findMany({
      where: {
        completedAt: {
          gte: weekStart,
        },
      },
    });

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

    const totalScrap = weeklyLogs.reduce((sum, l) => sum + l.kgScrap, 0);
    departmentScrap = Object.entries(deptScrapMap).map(([dept, kg]) => {
      const pct = totalScrap > 0 ? Math.round((kg as number / totalScrap) * 100) : 0;
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

    throughput = Object.entries(throughputMap).map(([dept, data]) => {
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
  }

  // Build stats array based on role
  let stats = [];

  if (isWarehouse) {
    // Warehouse sees inventory-focused stats
    stats = [
      {
        label: 'Raw material stock',
        value: rawMaterialStock,
        suffix: 'kg',
        sub: `${materials.length} materials · ${totalFree} kg free`,
        color: 'amber'
      },
      {
        label: 'Active production orders',
        value: activeOrdersCount,
        sub: 'Orders requiring materials',
        color: 'teal'
      }
    ];
  } else if (isOperator) {
    // Operators see department-focused stats
    stats = [
      {
        label: 'My department queue',
        value: activeOrdersCount,
        sub: 'Jobs ready for processing',
        color: 'purple'
      },
      {
        label: 'Today\'s throughput',
        value: throughput.find(t => t.dept === authUser.department)?.kg || 0,
        suffix: 'kg',
        sub: 'Processed in my department',
        color: 'teal'
      }
    ];
  } else if (isSales) {
    // Sales see sales-focused stats
    stats = [
      {
        label: 'Finished goods ready',
        value: finishedGoods._sum.kgProduced || 0,
        suffix: 'kg',
        sub: `${finishedGoods._sum.quantity || 0} units available`,
        color: 'purple'
      },
      {
        label: 'Active sales orders',
        value: 0, // Would need sales order count
        sub: 'Orders being fulfilled',
        color: 'teal'
      }
    ];
  } else {
    // Admin/Manager see full overview
    stats = [
      {
        label: 'Raw material stock',
        value: rawMaterialStock,
        suffix: 'kg',
        sub: `${materials.length} materials · ${totalFree} kg free`,
        color: 'amber'
      },
      {
        label: 'Active production orders',
        value: activeOrdersCount,
        sub: `${pendingApprovalsCount} pending approval · ${activeOrdersCount - pendingApprovalsCount} in production`,
        color: 'teal'
      },
      {
        label: 'Finished goods ready',
        value: finishedGoods._sum.kgProduced || 0,
        suffix: 'kg',
        sub: `${finishedGoods._sum.quantity || 0} units across designs`,
        color: 'purple'
      },
      {
        label: 'Scrap this week',
        value: scrapThisWeek,
        suffix: 'kg',
        sub: '↑ vs last week', // Simplified
        down: true,
        color: 'red'
      },
    ];
  }

  return {
    stats,
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
    userRole: authUser.role,
    userDepartment: authUser.department,
  };
}

export async function getManagerData() {
  const pendingApprovals = await prisma.productionOrder.findMany({
    where: { status: 'PENDING' },
    include: { design: true },
  });

  const activeProduction = await prisma.productionOrder.groupBy({
    by: ['currentDept'],
    where: { status: { in: ['APPROVED', 'IN_PRODUCTION'] } },
    _count: true,
  });

  const allLogs = await prisma.stageLog.findMany({
    where: { kgScrap: { gt: 0 } },
    include: { order: true },
  });
  const scrapAlerts = allLogs.filter(log => log.kgScrap > log.kgIn * 0.05);

  const totalActiveOrders = await prisma.productionOrder.count({
    where: { status: { in: ['APPROVED', 'IN_PRODUCTION'] } },
  });

  const totalTonnageAgg = await prisma.productionOrder.aggregate({
    where: { status: { in: ['APPROVED', 'IN_PRODUCTION'] } },
    _sum: { targetKg: true },
  });

  const pendingCount = pendingApprovals.length;

  return {
    pendingApprovals,
    activeProduction,
    scrapAlerts,
    totalActiveOrders,
    totalTonnage: totalTonnageAgg._sum.targetKg || 0,
    pendingCount,
  };
}

export async function approveOrder(orderId: string) {
  const order = await prisma.productionOrder.findUnique({
    where: { id: orderId },
    include: { design: true },
  });

  if (!order || order.status !== 'PENDING') {
    throw new Error('Invalid order');
  }

  const reserveKg = order.targetKg;

  if (!order.design.rawMaterialId) {
    throw new Error('No raw material assigned to design');
  }

  const material = await prisma.rawMaterial.findUnique({
    where: { id: order.design.rawMaterialId },
  });

  if (!material || material.availableKg < reserveKg) {
    throw new Error('Insufficient stock');
  }

  await prisma.rawMaterial.update({
    where: { id: material.id },
    data: {
      availableKg: material.availableKg - reserveKg,
      reservedKg: material.reservedKg + reserveKg,
    },
  });

  await prisma.productionOrder.update({
    where: { id: orderId },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      currentDept: 'Cutting', // Assuming first department
    },
  });

  revalidatePath('/manager');
}
