"use client";

export async function addRawMaterial(formData: FormData) {
  const data = {
    materialName: formData.get("materialName"), // e.g., "High-Tensile Steel"
    diameter: formData.get("diameter"),         // e.g., "M12"
    kgReceived: parseFloat(formData.get("kg") as string),
    supplier: formData.get("supplier"),
  };

  const response = await fetch('/api/inventory/intake', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error("Failed to log intake");
  return response.json();
}

// Server-side functions
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function getRawMaterials() {
  const user = await requireAuth();

  const materials = await prisma.rawMaterial.findMany({
    orderBy: {
      materialName: "asc",
    },
  });

  return materials.map(material => ({
    id: material.id,
    materialName: material.materialName,
    diameter: material.diameter,
    availableKg: material.availableKg,
    reservedKg: material.reservedKg,
    supplier: material.supplier,
    createdAt: material.createdAt,
  }));
}