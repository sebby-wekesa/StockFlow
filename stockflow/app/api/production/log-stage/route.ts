import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
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

    // Get the current order to find the stage name and sequence
    const order = await prisma.productionOrder.findUnique({
      where: { id: orderId },
      include: {
        design: {
          include: {
            stages: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Production order not found" }, { status: 404 });
    }

    // Find the current stage
    const currentStage = order.design.stages.find(s => s.id === stageId) ||
                        order.design.stages.find(s => s.sequence === stageId) ||
                        order.design.stages[order.currentStage - 1];

    if (!currentStage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    // Create the stage log
    const log = await prisma.stageLog.create({
      data: {
        orderId,
        kgIn,
        kgOut,
        kgScrap: kgScrap || 0,
        scrapReason,
        stageName: currentStage.name,
        sequence: currentStage.sequence,
        operatorId: "default-operator", // TODO: Get from auth
      }
    });

    // Update the order's targetKg for the next stage
    await prisma.productionOrder.update({
      where: { id: orderId },
      data: {
        targetKg: kgOut
      }
    });

    return NextResponse.json({
      success: true,
      log
    });

  } catch (error) {
    console.error("Stage logging error:", error);
    return NextResponse.json({ error: "Failed to log stage" }, { status: 500 });
  }
}