import { prisma } from "@/lib/prisma";
import { YieldDashboard } from "@/components/YieldDashboard";

function calculateGlobalYield(stats: any[]) {
  const totalIn = stats.reduce((acc, s) => acc + (s._sum.kgIn || 0), 0);
  const totalOut = stats.reduce((acc, s) => acc + (s._sum.kgOut || 0), 0);
  return totalIn ? (totalOut / totalIn) * 100 : 0;
}

async function getYieldData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // 1. Fetch Department Aggregates [cite: 98, 160]
  const stats = await prisma.stageLog.groupBy({
    by: ['department'],
    _sum: { kgIn: true, kgOut: true, kgScrap: true },
    where: { completedAt: { gte: thirtyDaysAgo } }
  });

  // 2. Fetch Scrap Distribution by Reason [cite: 33, 153]
  const scrapLogs = await prisma.stageLog.groupBy({
    by: ['scrapReason'],
    _sum: { kgScrap: true },
    where: { completedAt: { gte: thirtyDaysAgo } }
  });

  // 3. Fetch WIP (Work in Progress) [cite: 27, 99]
  const wipOrders = await prisma.productionOrder.groupBy({
    by: ['currentDept'],
    _count: { id: true },
    where: { status: 'IN_PRODUCTION' }
  });

  // 4. Fetch trend data for the last 90 days
  const trendData = await prisma.stageLog.groupBy({
    by: ['completedAt'],
    _sum: { kgIn: true, kgOut: true, kgScrap: true },
    where: { completedAt: { gte: ninetyDaysAgo } },
    orderBy: { completedAt: 'asc' }
  });

  // 5. Fetch department-wise yield trends
  const departmentTrends = await prisma.stageLog.groupBy({
    by: ['department', 'completedAt'],
    _sum: { kgIn: true, kgOut: true, kgScrap: true },
    where: { completedAt: { gte: ninetyDaysAgo } },
    orderBy: { completedAt: 'asc' }
  });

  // 6. Fetch design-wise yield analysis
  const designYield = await prisma.$queryRaw`
    SELECT
      d.name as design_name,
      d.code as design_code,
      SUM(sl.kgIn) as total_kg_in,
      SUM(sl.kgOut) as total_kg_out,
      SUM(sl.kgScrap) as total_kg_scrap,
      CASE WHEN SUM(sl.kgIn) > 0 THEN (SUM(sl.kgOut) / SUM(sl.kgIn)) * 100 ELSE 0 END as yield_percentage
    FROM "StageLog" sl
    JOIN "ProductionOrder" po ON sl."orderId" = po.id
    JOIN "Design" d ON po."designId" = d.id
    WHERE sl."completedAt" >= ${thirtyDaysAgo}
    GROUP BY d.id, d.name, d.code
    ORDER BY yield_percentage ASC
  `;

  // Transform trend data
  const yieldTrends = trendData.map(day => ({
    date: day.completedAt.toISOString().split('T')[0],
    kgIn: Number(day._sum.kgIn || 0),
    kgOut: Number(day._sum.kgOut || 0),
    kgScrap: Number(day._sum.kgScrap || 0),
    yieldPct: Number(day._sum.kgIn || 0) > 0 ? (Number(day._sum.kgOut || 0) / Number(day._sum.kgIn || 0)) * 100 : 0
  }));

  // Transform department trends
  const deptTrendMap = new Map();
  departmentTrends.forEach(trend => {
    const key = trend.department || 'Unknown';
    if (!deptTrendMap.has(key)) {
      deptTrendMap.set(key, []);
    }
    deptTrendMap.get(key).push({
      date: trend.completedAt.toISOString().split('T')[0],
      kgIn: Number(trend._sum.kgIn || 0),
      kgOut: Number(trend._sum.kgOut || 0),
      kgScrap: Number(trend._sum.kgScrap || 0),
      yieldPct: Number(trend._sum.kgIn || 0) > 0 ? (Number(trend._sum.kgOut || 0) / Number(trend._sum.kgIn || 0)) * 100 : 0
    });
  });

  const departmentTrendsFormatted = Array.from(deptTrendMap.entries()).map(([department, data]) => ({
    department,
    data
  }));

  // Transform into your YieldData type
  return {
    globalYield: calculateGlobalYield(stats), // Logic: (Total Out / Total In) * 100
    totals: {
      kgIn: stats.reduce((acc, s) => acc + (s._sum.kgIn || 0), 0),
      kgOut: stats.reduce((acc, s) => acc + (s._sum.kgOut || 0), 0),
      kgScrap: stats.reduce((acc, s) => acc + (s._sum.kgScrap || 0), 0),
    },
    departmentStats: stats.map(s => ({
      department: s.department,
      kgIn: s._sum.kgIn || 0,
      kgOut: s._sum.kgOut || 0,
      kgScrap: s._sum.kgScrap || 0,
      yieldPct: s._sum.kgIn ? ((s._sum.kgOut || 0) / s._sum.kgIn) * 100 : 0
    })),
    scrapDistribution: scrapLogs.map(l => ({
      reason: l.scrapReason || "Unspecified",
      kgScrap: l._sum.kgScrap || 0
    })),
    wip: wipOrders.map(w => ({
      department: w.currentDept || "Unknown",
      kgRemaining: 0, // Simplified for now
      orderCount: w._count.id
    })),
    yieldTrends,
    departmentTrends: departmentTrendsFormatted,
    designYield: designYield as any[]
  };
}

export default async function YieldPage() {
  const data = await getYieldData();
  return (
    <div className="p-8 bg-[#0f1113] min-h-screen">
      <h1 className="text-2xl font-bold text-white mb-6">Yield Intelligence</h1>
      <YieldDashboard data={data} />
    </div>
  );
}