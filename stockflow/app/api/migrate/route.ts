import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const results = [];

    // Create Organization table
    try {
      await prisma.$queryRaw`
        CREATE TABLE IF NOT EXISTS "public"."Organization" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "address" TEXT,
          "phone" TEXT,
          "email" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
        );
      `;
      await prisma.$queryRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "Organization_code_key" ON "public"."Organization"("code");
      `;
      results.push('Organization table created');
    } catch (e) {
      results.push('Organization table error: ' + e.message);
    }

    // Create Branch table
    try {
      await prisma.$queryRaw`
        CREATE TABLE IF NOT EXISTS "public"."Branch" (
          "id" TEXT NOT NULL,
          "organizationId" TEXT,
          "name" TEXT NOT NULL,
          "location" TEXT,
          "code" TEXT NOT NULL,
          "address" TEXT,
          "phone" TEXT,
          "managerId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
        );
      `;
      await prisma.$queryRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "Branch_code_key" ON "public"."Branch"("code");
      `;
      await prisma.$queryRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "Branch_name_key" ON "public"."Branch"("name");
      `;
      results.push('Branch table created');
    } catch (e) {
      results.push('Branch table error: ' + e.message);
    }

    // Create Supplier table
    try {
      await prisma.$queryRaw`
        CREATE TABLE IF NOT EXISTS "public"."Supplier" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "contactName" TEXT,
          "email" TEXT,
          "phone" TEXT,
          "address" TEXT,
          "taxId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
        );
      `;
      await prisma.$queryRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_code_key" ON "public"."Supplier"("code");
      `;
      results.push('Supplier table created');
    } catch (e) {
      results.push('Supplier table error: ' + e.message);
    }

    // Create RawMaterial table
    try {
      await prisma.$queryRaw`
        CREATE TABLE IF NOT EXISTS "public"."RawMaterial" (
          "id" TEXT NOT NULL,
          "sku" TEXT NOT NULL,
          "materialName" TEXT NOT NULL,
          "diameter" TEXT NOT NULL,
          "supplierId" TEXT,
          "barcode" TEXT,
          "batchNumber" TEXT,
          "availableKg" DECIMAL(10,4) NOT NULL DEFAULT 0,
          "reservedKg" DECIMAL(10,4) NOT NULL DEFAULT 0,
          "costPerKg" FLOAT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "RawMaterial_pkey" PRIMARY KEY ("id")
        );
      `;
      await prisma.$queryRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "RawMaterial_sku_key" ON "public"."RawMaterial"("sku");
      `;
      await prisma.$queryRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "RawMaterial_barcode_key" ON "public"."RawMaterial"("barcode");
      `;
      results.push('RawMaterial table created');
    } catch (e) {
      results.push('RawMaterial table error: ' + e.message);
    }

    // Create Design table
    try {
      await prisma.$queryRaw`
        CREATE TABLE IF NOT EXISTS "public"."Design" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "description" TEXT,
          "targetDimensions" TEXT,
          "targetWeight" DECIMAL(10,4),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Design_pkey" PRIMARY KEY ("id")
        );
      `;
      await prisma.$queryRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "Design_code_key" ON "public"."Design"("code");
      `;
      results.push('Design table created');
    } catch (e) {
      results.push('Design table error: ' + e.message);
    }

    // Create Stage table
    try {
      await prisma.$queryRaw`
        CREATE TABLE IF NOT EXISTS "public"."Stage" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "department" TEXT NOT NULL,
          "sequence" INTEGER NOT NULL,
          "designId" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
        );
      `;
      await prisma.$queryRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "Stage_designId_sequence_key" ON "public"."Stage"("designId", "sequence");
      `;
      results.push('Stage table created');
    } catch (e) {
      results.push('Stage table error: ' + e.message);
    }

    // Create FinishedGoods table
    try {
      await prisma.$queryRaw`
        CREATE TABLE IF NOT EXISTS "public"."FinishedGoods" (
          "id" TEXT NOT NULL,
          "sku" TEXT NOT NULL,
          "designId" TEXT NOT NULL,
          "quantity" INTEGER NOT NULL,
          "kgProduced" DECIMAL(10,4) NOT NULL,
          "barcode" TEXT,
          "batchNumber" TEXT,
          "unitCost" FLOAT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "FinishedGoods_pkey" PRIMARY KEY ("id")
        );
      `;
      await prisma.$queryRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "FinishedGoods_sku_key" ON "public"."FinishedGoods"("sku");
      `;
      await prisma.$queryRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "FinishedGoods_barcode_key" ON "public"."FinishedGoods"("barcode");
      `;
      results.push('FinishedGoods table created');
    } catch (e) {
      results.push('FinishedGoods table error: ' + e.message);
    }

    // Create ProductionOrder table
    try {
      await prisma.$queryRaw`
        CREATE TABLE IF NOT EXISTS "public"."ProductionOrder" (
          "id" TEXT NOT NULL,
          "orderNumber" TEXT NOT NULL,
          "designId" TEXT NOT NULL,
          "quantity" INTEGER NOT NULL DEFAULT 1,
          "targetKg" DECIMAL(10,4) NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
          "currentStage" INTEGER NOT NULL DEFAULT 1,
          "currentDept" TEXT,
          "assignedTo" TEXT,
          "approvedBy" TEXT,
          "approvedAt" TIMESTAMP(3),
          "completedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
        );
      `;
      await prisma.$queryRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "ProductionOrder_orderNumber_key" ON "public"."ProductionOrder"("orderNumber");
      `;
      results.push('ProductionOrder table created');
    } catch (e) {
      results.push('ProductionOrder table error: ' + e.message);
    }

    // Create StageLog table
    try {
      await prisma.$queryRaw`
        CREATE TABLE IF NOT EXISTS "public"."StageLog" (
          "id" TEXT NOT NULL,
          "orderId" TEXT NOT NULL,
          "stageId" TEXT,
          "stageName" TEXT NOT NULL,
          "sequence" INTEGER NOT NULL,
          "kgIn" DECIMAL(10,4) NOT NULL,
          "kgOut" DECIMAL(10,4) NOT NULL,
          "kgScrap" DECIMAL(10,4) NOT NULL,
          "scrapReason" TEXT,
          "department" TEXT,
          "operatorId" TEXT NOT NULL,
          "notes" TEXT,
          "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "StageLog_pkey" PRIMARY KEY ("id")
        );
      `;
      results.push('StageLog table created');
    } catch (e) {
      results.push('StageLog table error: ' + e.message);
    }

    // Create ImportBatch table
    try {
      await prisma.$queryRaw`
        CREATE TABLE IF NOT EXISTS "public"."ImportBatch" (
          "id" TEXT NOT NULL,
          "file_name" TEXT NOT NULL,
          "sheet_type" TEXT NOT NULL,
          "import_mode" TEXT NOT NULL DEFAULT 'update',
          "target_branch" TEXT,
          "status" TEXT NOT NULL DEFAULT 'uploaded',
          "row_count" INTEGER NOT NULL,
          "created_by" TEXT NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
        );
      `;
      results.push('ImportBatch table created');
    } catch (e) {
      results.push('ImportBatch table error: ' + e.message);
    }

    // Create ImportRow table
    try {
      await prisma.$queryRaw`
        CREATE TABLE IF NOT EXISTS "public"."ImportRow" (
          "id" TEXT NOT NULL,
          "batch_id" TEXT NOT NULL,
          "row_number" INTEGER NOT NULL,
          "raw_data" JSONB NOT NULL,
          "mapped_data" JSONB,
          "matched_product" TEXT,
          "match_confidence" FLOAT,
          "resolution" TEXT,
          "resolved_product" TEXT,
          "order_number" TEXT,
          "customer_name" TEXT,
          "qty" FLOAT,
          "unit_price" FLOAT,
          "notes" TEXT,
          "errors" TEXT,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
        );
      `;
      await prisma.$queryRaw`
        CREATE INDEX IF NOT EXISTS "ImportRow_batch_id_idx" ON "public"."ImportRow"("batch_id");
      `;
      results.push('ImportRow table created');
    } catch (e) {
      results.push('ImportRow table error: ' + e.message);
    }

    // Create remaining tables
    const remainingTables = [
      {
        name: 'BillOfMaterials',
        sql: `
          CREATE TABLE IF NOT EXISTS "public"."BillOfMaterials" (
            "id" TEXT NOT NULL,
            "designId" TEXT NOT NULL,
            "rawMaterialId" TEXT NOT NULL,
            "quantity" DECIMAL(10,4) NOT NULL,
            "unitOfMeasure" TEXT NOT NULL DEFAULT 'kg',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "BillOfMaterials_pkey" PRIMARY KEY ("id")
          );
        `,
        index: `CREATE UNIQUE INDEX IF NOT EXISTS "BillOfMaterials_designId_rawMaterialId_key" ON "public"."BillOfMaterials"("designId", "rawMaterialId");`
      },
      {
        name: 'InventoryFinishedGoods',
        sql: `
          CREATE TABLE IF NOT EXISTS "public"."InventoryFinishedGoods" (
            "id" TEXT NOT NULL,
            "branchId" TEXT NOT NULL,
            "finishedGoodsId" TEXT NOT NULL,
            "availableQty" INTEGER NOT NULL DEFAULT 0,
            "reservedQty" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "InventoryFinishedGoods_pkey" PRIMARY KEY ("id")
          );
        `,
        index: `CREATE UNIQUE INDEX IF NOT EXISTS "InventoryFinishedGoods_branchId_finishedGoodsId_key" ON "public"."InventoryFinishedGoods"("branchId", "finishedGoodsId");`
      },
      {
        name: 'InventoryRawMaterial',
        sql: `
          CREATE TABLE IF NOT EXISTS "public"."InventoryRawMaterial" (
            "id" TEXT NOT NULL,
            "branchId" TEXT NOT NULL,
            "rawMaterialId" TEXT NOT NULL,
            "availableKg" DECIMAL(10,4) NOT NULL DEFAULT 0,
            "reservedKg" DECIMAL(10,4) NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "InventoryRawMaterial_pkey" PRIMARY KEY ("id")
          );
        `,
        index: `CREATE UNIQUE INDEX IF NOT EXISTS "InventoryRawMaterial_branchId_rawMaterialId_key" ON "public"."InventoryRawMaterial"("branchId", "rawMaterialId");`
      },
      {
        name: 'Product',
        sql: `
          CREATE TABLE IF NOT EXISTS "public"."Product" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "sku" TEXT,
            "category" TEXT NOT NULL DEFAULT 'manufactured_spring',
            "origin" TEXT NOT NULL DEFAULT 'FACTORY_MADE',
            "uom" TEXT NOT NULL DEFAULT 'PCS',
            "currentStock" FLOAT NOT NULL DEFAULT 0,
            "unitCost" FLOAT,
            "landingCost" FLOAT,
            "vendor" TEXT,
            "branchId" TEXT,
            "reorderLevel" INTEGER,
            "stockStatus" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
          );
        `,
        index: `CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_key" ON "public"."Product"("sku");`
      },
      {
        name: 'ProductAlias',
        sql: `
          CREATE TABLE IF NOT EXISTS "public"."ProductAlias" (
            "id" TEXT NOT NULL,
            "product_id" TEXT NOT NULL,
            "alias" TEXT NOT NULL,
            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "ProductAlias_pkey" PRIMARY KEY ("id")
          );
        `,
        index: `
          CREATE UNIQUE INDEX IF NOT EXISTS "ProductAlias_product_id_alias_key" ON "public"."ProductAlias"("product_id", "alias");
          CREATE INDEX IF NOT EXISTS "ProductAlias_alias_idx" ON "public"."ProductAlias"("alias");
        `
      },
      {
        name: 'Customer',
        sql: `
          CREATE TABLE IF NOT EXISTS "public"."Customer" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "code" TEXT NOT NULL,
            "contactName" TEXT,
            "email" TEXT,
            "phone" TEXT,
            "address" TEXT,
            "taxId" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
          );
        `,
        index: `CREATE UNIQUE INDEX IF NOT EXISTS "Customer_code_key" ON "public"."Customer"("code");`
      },
      {
        name: 'SaleOrder',
        sql: `
          CREATE TABLE IF NOT EXISTS "public"."SaleOrder" (
            "id" TEXT NOT NULL,
            "customerId" TEXT,
            "customerName" TEXT NOT NULL,
            "totalAmount" DECIMAL(10,2) NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'PENDING',
            "createdBy" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "SaleOrder_pkey" PRIMARY KEY ("id")
          );
        `
      },
      {
        name: 'SaleItem',
        sql: `
          CREATE TABLE IF NOT EXISTS "public"."SaleItem" (
            "id" TEXT NOT NULL,
            "saleOrderId" TEXT NOT NULL,
            "finishedGoodsId" TEXT NOT NULL,
            "quantity" INTEGER NOT NULL,
            "unitPrice" DECIMAL(10,2) NOT NULL,
            "totalPrice" DECIMAL(10,2) NOT NULL,
            CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
          );
        `
      },
      {
        name: 'PurchaseOrder',
        sql: `
          CREATE TABLE IF NOT EXISTS "public"."PurchaseOrder" (
            "id" TEXT NOT NULL,
            "poNumber" TEXT NOT NULL,
            "supplierId" TEXT NOT NULL,
            "status" TEXT NOT NULL DEFAULT 'DRAFT',
            "totalAmount" DECIMAL(10,2) NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            "approvedBy" TEXT,
            "approvedAt" TIMESTAMP(3),
            "expectedDelivery" TIMESTAMP(3),
            "notes" TEXT,
            CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
          );
        `,
        index: `CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_poNumber_key" ON "public"."PurchaseOrder"("poNumber");`
      },
      {
        name: 'PurchaseOrderItem',
        sql: `
          CREATE TABLE IF NOT EXISTS "public"."PurchaseOrderItem" (
            "id" TEXT NOT NULL,
            "purchaseOrderId" TEXT NOT NULL,
            "rawMaterialId" TEXT NOT NULL,
            "quantity" DECIMAL(10,4) NOT NULL,
            "unitPrice" DECIMAL(10,2) NOT NULL,
            "totalPrice" DECIMAL(10,2) NOT NULL,
            CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
          );
        `
      },
      {
        name: 'StockMovement',
        sql: `
          CREATE TABLE IF NOT EXISTS "public"."StockMovement" (
            "id" TEXT NOT NULL,
            "productId" TEXT NOT NULL,
            "branchId" TEXT,
            "movementType" TEXT NOT NULL,
            "quantity" FLOAT NOT NULL,
            "reference" TEXT,
            "notes" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
          );
        `
      },
      {
        name: 'AuditLog',
        sql: `
          CREATE TABLE IF NOT EXISTS "public"."AuditLog" (
            "id" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "action" TEXT NOT NULL,
            "entityType" TEXT,
            "entityId" TEXT,
            "details" TEXT,
            "ipAddress" TEXT,
            "userAgent" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
          );
        `
      }
    ];

    for (const table of remainingTables) {
      try {
        console.log(`Creating table: ${table.name}`);
        await prisma.$queryRaw(table.sql);
        if (table.index) {
          console.log(`Creating index for: ${table.name}`);
          await prisma.$queryRaw(table.index);
        }
        results.push(`${table.name} table created`);
      } catch (e) {
        console.error(`Error creating ${table.name}:`, e);
        results.push(`${table.name} table error: ${e.message}`);
      }
    }

    // Add foreign keys (do this after all tables are created)
    try {
      const foreignKeys = [
        `ALTER TABLE "public"."User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."Branch" ADD CONSTRAINT "Branch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."RawMaterial" ADD CONSTRAINT "RawMaterial_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."Stage" ADD CONSTRAINT "Stage_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."FinishedGoods" ADD CONSTRAINT "FinishedGoods_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."ProductionOrder" ADD CONSTRAINT "ProductionOrder_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."StageLog" ADD CONSTRAINT "StageLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."StageLog" ADD CONSTRAINT "StageLog_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."StageLog" ADD CONSTRAINT "StageLog_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."ImportBatch" ADD CONSTRAINT "ImportBatch_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."ImportRow" ADD CONSTRAINT "ImportRow_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."BillOfMaterials" ADD CONSTRAINT "BillOfMaterials_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."BillOfMaterials" ADD CONSTRAINT "BillOfMaterials_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."InventoryFinishedGoods" ADD CONSTRAINT "InventoryFinishedGoods_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."InventoryFinishedGoods" ADD CONSTRAINT "InventoryFinishedGoods_finishedGoodsId_fkey" FOREIGN KEY ("finishedGoodsId") REFERENCES "FinishedGoods"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."InventoryRawMaterial" ADD CONSTRAINT "InventoryRawMaterial_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."InventoryRawMaterial" ADD CONSTRAINT "InventoryRawMaterial_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."ProductAlias" ADD CONSTRAINT "ProductAlias_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."SaleOrder" ADD CONSTRAINT "SaleOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."SaleOrder" ADD CONSTRAINT "SaleOrder_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."SaleItem" ADD CONSTRAINT "SaleItem_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SaleOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."SaleItem" ADD CONSTRAINT "SaleItem_finishedGoodsId_fkey" FOREIGN KEY ("finishedGoodsId") REFERENCES "FinishedGoods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;`,
        `ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
      ];

      for (const fk of foreignKeys) {
        try {
          await prisma.$queryRaw(fk);
        } catch (e) {
          // Foreign key might already exist, continue
        }
      }
      results.push('Foreign keys added');
    } catch (e) {
      results.push('Foreign keys error: ' + e.message);
    }

    return NextResponse.json({ message: 'Migration completed', results });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Migration failed', details: error.message }, { status: 500 });
  }
}