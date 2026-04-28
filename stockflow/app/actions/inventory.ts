"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ─── Raw Materials ──────────────────────────────────────────────────────────

export async function getRawMaterials() {
  await requireAuth();

  const materials = await prisma.rawMaterial.findMany({
    include: { supplier: true },
    orderBy: { materialName: "asc" },
  });

  return materials.map((m) => ({
    id: m.id,
    materialName: m.materialName,
    diameter: m.diameter,
    availableKg: m.availableKg,
    reservedKg: m.reservedKg,
    supplier: m.supplier,
    createdAt: m.createdAt,
  }));
}

// ─── Local Purchase & Imported Goods ────────────────────────────────────────

export type AddProductStockInput = {
  name: string;
  origin: "LOCAL_PURCHASE" | "IMPORTED";
  uom: "PCS" | "KGS";
  quantity: number;
  unitCost?: number;
  landingCost?: number;
  vendor?: string;
  branchId?: string;
  reference?: string;
};

export async function addProductStock(input: AddProductStockInput) {
  const user = await requireAuth();

  const {
    name,
    origin,
    uom,
    quantity,
    unitCost,
    landingCost,
    vendor,
    branchId,
    reference,
  } = input;

  if (!name || !origin || !uom || quantity <= 0) {
    throw new Error("Missing required fields: name, origin, uom, quantity > 0");
  }

  // Upsert Product
  const existing = await prisma.product.findFirst({
    where: { name, origin, branchId: branchId ?? null },
  });

  let product;
  if (existing) {
    product = await prisma.product.update({
      where: { id: existing.id },
      data: {
        currentStock: existing.currentStock + quantity,
        unitCost: unitCost ?? existing.unitCost,
        landingCost: landingCost ?? existing.landingCost,
        vendor: vendor ?? existing.vendor,
        updatedAt: new Date(),
      },
    });
  } else {
    const sku = `${origin.slice(0, 3)}-${name
      .replace(/\s+/g, "-")
      .toUpperCase()
      .slice(0, 20)}-${Date.now().toString().slice(-6)}`;

    product = await prisma.product.create({
      data: {
        name,
        sku,
        origin,
        uom,
        currentStock: quantity,
        unitCost: unitCost ?? null,
        landingCost: landingCost ?? null,
        vendor: vendor ?? null,
        branchId: branchId ?? null,
      },
    });
  }

  // Audit receipt
  await prisma.productReceipt.create({
    data: {
      productId: product.id,
      qtyReceived: quantity,
      unitCost: unitCost ?? null,
      landingCost: landingCost ?? null,
      reference: reference ?? null,
      vendor: vendor ?? null,
      loggedBy: (user as { email?: string; name?: string }).email ?? null,
      branchId: branchId ?? null,
    },
  });

  revalidatePath("/inventory");
  return { success: true, product };
}

// ─── Getters for inventory page ─────────────────────────────────────────────

export async function getProducts(origin?: "LOCAL_PURCHASE" | "IMPORTED" | "FACTORY_MADE") {
  await requireAuth();

  const products = await prisma.product.findMany({
    where: origin ? { origin } : undefined,
    include: {
      branch: { select: { name: true } },
      receipts: { orderBy: { createdAt: "desc" }, take: 50 },
    },
    orderBy: { createdAt: "desc" },
  });

  return products;
}