import { prisma } from "@/lib/prisma";
import { YieldDashboard } from "@/components/YieldDashboard";
import { Decimal } from "@prisma/client";

function calculateGlobalYield(stats: any[]) {
  const totalIn = stats.reduce(
    (sum, s) => sum.add(s._sum.kgIn || new Decimal(0)),
    new Decimal(0)
  );
  const totalOut = stats.reduce(
    (sum, s) => sum.add(s._sum.kgOut || new Decimal(0)),
    new Decimal(0)
  );
  return totalIn.isZero() ? 0 : totalOut.div(totalIn).mul(100).toNumber();
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
  const yieldTrends = trendData.map(day => {
    const kgIn = day._sum.kgIn || new Decimal(0);
    const kgOut = day._sum.kgOut || new Decimal(0);
    const kgScrap = day._sum.kgScrap || new Decimal(0);
    return {
      date: day.completedAt.toISOString().split('T')[0],
      kgIn: kgIn.toNumber(),
      kgOut: kgOut.toNumber(),
      kgScrap: kgScrap.toNumber(),
      yieldPct: kgIn.isZero() ? 0 : kgOut.div(kgIn).mul(100).toNumber()
    };
  });

  // Transform department trends
  const deptTrendMap = new Map();
  departmentTrends.forEach(trend => {
    const key = trend.department || 'Unknown';
    if (!deptTrendMap.has(key)) {
      deptTrendMap.set(key, []);
    }
    const kgIn = trend._sum.kgIn || new Decimal(0);
    const kgOut = trend._sum.kgOut || new Decimal(0);
    const kgScrap = trend._sum.kgScrap || new Decimal(0);
    deptTrendMap.get(key).push({
      date: trend.completedAt.toISOString().split('T')[0],
      kgIn: kgIn.toNumber(),
      kgOut: kgOut.toNumber(),
      kgScrap: kgScrap.toNumber(),
      yieldPct: kgIn.isZero() ? 0 : kgOut.div(kgIn).mul(100).toNumber()
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
      kgIn: stats.reduce((acc, s) => acc.add(s._sum.kgIn || new Decimal(0)), new Decimal(0)).toNumber(),
      kgOut: stats.reduce((acc, s) => acc.add(s._sum.kgOut || new Decimal(0)), new Decimal(0)).toNumber(),
      kgScrap: stats.reduce((acc, s) => acc.add(s._sum.kgScrap || new Decimal(0)), new Decimal(0)).toNumber(),
    },
    departmentStats: stats.map(s => {
      const kgIn = s._sum.kgIn || new Decimal(0);
      const kgOut = s._sum.kgOut || new Decimal(0);
      return {
        department: s.department,
        kgIn: kgIn.toNumber(),
        kgOut: kgOut.toNumber(),
        kgScrap: (s._sum.kgScrap || new Decimal(0)).toNumber(),
        yieldPct: kgIn.isZero() ? 0 : kgOut.div(kgIn).mul(100).toNumber()
      };
    }),
    scrapDistribution: scrapLogs.map(l => ({
      reason: l.scrapReason || "Unspecified",
      kgScrap: (l._sum.kgScrap || new Decimal(0)).toNumber()
    })),
    wip: wipOrders.map(w => ({
      department: w.currentDept || "Unknown",
      kgRemaining: 0, // Simplified for now
      orderCount: w._count.id
    })),
    yieldTrends,
    departmentTrends: departmentTrendsFormatted,
    designYield: 0
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