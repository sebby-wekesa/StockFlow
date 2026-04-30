p"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { StockOrigin } from "@prisma/client"

export async function receiveRawMaterialsBatch(
  data: any[],
  loggedBy: string = "System"
) {
  try {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process each row
    for (const [index, row] of data.entries()) {
      try {
        const sku = row['SKU'] || row['sku'];
        const materialName = row['Material Name'] || row['materialName'] || row['name'];
        const diameter = row['Diameter'] || row['diameter']?.toString();
        const kgReceived = parseFloat(row['Kg Received'] || row['kgReceived'] || row['quantity']);
        const reference = row['Reference'] || row['reference']?.toString();

        if (!sku || !materialName || !diameter || isNaN(kgReceived)) {
          results.failed++;
          results.errors.push(`Row ${index + 2}: Missing required fields (SKU, Material Name, Diameter, Kg Received)`);
          continue;
        }

        await prisma.$transaction(async (tx) => {
          // 1. Upsert the RawMaterial
          const material = await tx.rawMaterial.upsert({
            where: { sku },
            update: {
              availableKg: { increment: kgReceived },
              // optionally update name or diameter if provided, but typically we just add stock
            },
            create: {
              sku,
              materialName,
              diameter,
              availableKg: kgReceived,
              reservedKg: 0,
            }
          });

          // 2. Create the Receipt Log
          await tx.materialReceipt.create({
            data: {
              materialId: material.id,
              kgReceived: kgReceived,
              reference: reference || 'EXCEL_BATCH',
              loggedBy: loggedBy,
            }
          });
        });

        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Row ${index + 2}: ${err.message}`);
      }
    }

    revalidatePath("/rawmaterials");
    return { success: true, results };

  } catch (error: any) {
    console.error("Batch upload error:", error);
    return { success: false, error: "Failed to process the batch upload." };
  }
}
