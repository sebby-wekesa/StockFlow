import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUser, requireRole } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // 1. Verify Authentication & Role [cite: 55, 137]
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    // Check if user has OPERATOR or ADMIN role
    if (user.role !== 'OPERATOR' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden: Only operators can log production" }, { status: 403 });
    }

    const body = await req.json();
    const {
      orderId,
      stageId,
      kgIn,
      kgOut,
      kgScrap,
      scrapReason,
    } = body;

    // Validate required fields
    if (!orderId || kgIn === undefined || kgOut === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2. Get the current order with full stage sequence
    const order = await prisma.productionOrder.findUnique({
      where: { id: orderId },
      include: {
        design: {
          include: {
            stages: {
              orderBy: { sequence: "asc" }
            }
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Production order not found" }, { status: 404 });
    }

    // 3. Identify Current and Next Stage
    const stages = order.design.stages;
    const currentStageIndex = stages.findIndex(s => s.id === stageId || s.sequence === order.currentStage);
    const currentStage = stages[currentStageIndex];
    
    if (!currentStage) {
      return NextResponse.json({ error: "Current stage not found in sequence" }, { status: 404 });
    }

    const nextStage = stages[currentStageIndex + 1];

    // 4. Create the stage log [cite: 147, 153]
    const log = await prisma.stageLog.create({
      data: {
        orderId,
        kgIn,
        kgOut,
        kgScrap: kgScrap || 0,
        scrapReason,
        stageName: currentStage.name,
        sequence: currentStage.sequence,
        operatorId: user.id,
        department: currentStage.department,
      }
    });

    // 5. Update the Production Order (The Handoff) [cite: 99, 103]
    const isLastStage = !nextStage;
    
    await prisma.productionOrder.update({
      where: { id: orderId },
      data: {
        targetKg: kgOut,
        currentStage: nextStage ? nextStage.sequence : order.currentStage,
        currentDept: nextStage ? nextStage.department : order.currentDept,
        status: isLastStage ? "COMPLETED" : "IN_PRODUCTION",
      }
    });

    return NextResponse.json({
      success: true,
      message: isLastStage ? "Order completed" : `Advanced to ${nextStage.department}`,
      log,
      isCompleted: isLastStage
    });

  } catch (error) {
    console.error("Stage logging error:", error);
    return NextResponse.json({ error: "Failed to log stage" }, { status: 500 });
  }
}