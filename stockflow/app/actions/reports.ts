import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client-runtime-utils'

export interface DepartmentBreakdown {
  department: string
  totalIn: number
  totalOut: number
  totalScrap: number
  yieldEfficiency: number
  stageCount: number
}

export interface MonthlyYieldReport {
  totalIn: number
  totalOut: number
  totalScrap: number
  yieldEfficiency: string
  deptBreakdown: DepartmentBreakdown[]
}

function summarizeByDept(logs: any[]): DepartmentBreakdown[] {
  const deptMap = new Map<string, {
    totalIn: Decimal
    totalOut: Decimal
    totalScrap: Decimal
    stageCount: number
  }>()

  logs.forEach(log => {
    const dept = log.department || 'Unknown'
    const current = deptMap.get(dept) || {
      totalIn: new Decimal(0),
      totalOut: new Decimal(0),
      totalScrap: new Decimal(0),
      stageCount: 0
    }

    current.totalIn = current.totalIn.add(log.kgIn || new Decimal(0))
    current.totalOut = current.totalOut.add(log.kgOut || new Decimal(0))
    current.totalScrap = current.totalScrap.add(log.kgScrap || new Decimal(0))
    current.stageCount += 1

    deptMap.set(dept, current)
  })

  return Array.from(deptMap.entries()).map(([department, data]) => ({
    department,
    totalIn: data.totalIn.toNumber(),
    totalOut: data.totalOut.toNumber(),
    totalScrap: data.totalScrap.toNumber(),
    yieldEfficiency: data.totalIn.isZero() ? 0 : data.totalOut.div(data.totalIn).mul(100).toNumber(),
    stageCount: data.stageCount
  })).sort((a, b) => b.yieldEfficiency - a.yieldEfficiency)
}

export async function getMonthlyYieldReport(): Promise<MonthlyYieldReport> {
  const logs = await prisma.stageLog.findMany({
    where: {
      completedAt: {
        gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) // Last 30 days
      }
    }
  })

  // Calculate Aggregates
  const totalIn = logs.reduce((sum, log) => sum.add(log.kgIn || new Decimal(0)), new Decimal(0))
  const totalOut = logs.reduce((sum, log) => sum.add(log.kgOut || new Decimal(0)), new Decimal(0))
  const totalScrap = logs.reduce((sum, log) => sum.add(log.kgScrap || new Decimal(0)), new Decimal(0))

  const yieldEfficiency = totalIn.isZero() ? '0.00' : totalOut.div(totalIn).mul(100).toFixed(2)

  return {
    totalIn: totalIn.toNumber(),
    totalOut: totalOut.toNumber(),
    totalScrap: totalScrap.toNumber(),
    yieldEfficiency,
    // Grouping by department for the chart
    deptBreakdown: summarizeByDept(logs)
  }
}

export async function exportCompletedOrdersCSV(startDate: Date, endDate: Date): Promise<string> {
  const orders = await prisma.productionOrder.findMany({
    where: {
      status: 'COMPLETED',
      updatedAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      design: true,
      logs: {
        orderBy: {
          sequence: 'asc'
        }
      }
    }
  })

  // CSV Header
  let csv = 'Order Number,Design,Start Weight (kg),End Weight (kg),Total Scrap (kg),Yield %,Completion Date\n'

  orders.forEach(order => {
    const startWeight = order.logs.length > 0 ? order.logs[0].kgIn : new Decimal(0)
    const endWeight = order.logs.length > 0 ? order.logs[order.logs.length - 1].kgOut : new Decimal(0)
    const totalScrap = order.logs.reduce((sum, log) => sum.add(log.kgScrap || new Decimal(0)), new Decimal(0))
    const yieldPercent = startWeight.isZero() ? '0.00' : endWeight.div(startWeight).mul(100).toFixed(2)

    csv += `${order.orderNumber},${order.design.name},${startWeight.toNumber()},${endWeight.toNumber()},${totalScrap.toNumber()},${yieldPercent},${order.updatedAt.toISOString().split('T')[0]}\n`
  })

  return csv
}