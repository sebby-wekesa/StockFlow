"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, getUser } from "@/lib/auth";
import { productionOrderSchema, ProductionOrderInput } from "@/lib/validations";

export async function createProductionOrder(formData: FormData) {
  await requireRole("ADMIN");

  const designId = formData.get("designId") as string;
  const quantity = parseInt(formData.get("quantity") as string);
  const targetKg = parseFloat(formData.get("targetKg") as string);

  // Generate order number (ORD-YYYY-NNNN)
  const currentYear = new Date().getFullYear();
  const lastOrder = await prisma.productionOrder.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { orderNumber: true },
  });

  let nextNumber = 1;
  if (lastOrder?.orderNumber) {
    const match = lastOrder.orderNumber.match(/ORD-\d{4}-(\d{4})/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  const orderNumber = `ORD-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;

  const input: ProductionOrderInput = {
    designId,
    quantity,
    targetKg,
    orderNumber,
  };

  productionOrderSchema.parse(input);

  const design = await prisma.design.findUnique({
    where: { id: designId },
    include: { stages: { orderBy: { sequence: "asc" } } },
  });

  if (!design) {
    throw new Error("Design not found");
  }

  if (design.stages.length === 0) {
    throw new Error("Design must have at least one stage");
  }
  const initialStage = design.stages[0];

  const order = await prisma.productionOrder.create({
    data: {
      orderNumber: input.orderNumber,
      designId: input.designId,
      quantity: input.quantity,
      targetKg: input.targetKg,
      status: "PENDING",
      currentStage: initialStage.sequence,
    },
  });

  redirect("/orders");
}

export async function approveProductionOrder(orderId: string) {
  await requireRole("ADMIN");

  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const order = await prisma.productionOrder.findUnique({
    where: { id: orderId },
    include: {
      design: true,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.status !== "PENDING") {
    throw new Error("Order is not pending approval");
  }

  if (!order.design.rawMaterialId) {
    throw new Error("Design does not have an assigned raw material");
  }

  // Calculate the required KG
  const requiredKg = order.quantity * order.design.kgPerUnit;

  // Perform the transaction to approve order and reserve inventory
  await prisma.$transaction(async (tx) => {
    // 1. Deduct from Available and add to Reserved
    await tx.rawMaterial.update({
      where: { id: order.design.rawMaterialId! },
      data: {
        availableKg: { decrement: requiredKg },
        reservedKg: { increment: requiredKg }
      }
    });

    // 2. Update the Order Status
    await tx.productionOrder.update({
      where: { id: orderId },
      data: {
        status: "APPROVED",
        approvedBy: user.id,
        approvedAt: new Date(),
      },
    });
  });

  redirect("/approvals");
}

export async function rejectProductionOrder(orderId: string) {
  await requireRole("ADMIN");

  const order = await prisma.productionOrder.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.status !== "PENDING") {
    throw new Error("Order is not pending approval");
  }

  await prisma.productionOrder.update({
    where: { id: orderId },
    data: { status: "CANCELLED" },
  });

  redirect("/approvals");
}