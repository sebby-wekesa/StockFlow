import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { scryptSync, randomBytes, randomUUID } from 'crypto'

// Supabase admin client commented out - seeding without auth for now
// const supabaseAdmin = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// )

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function seedDesigns() {
  const designs = [
    {
      name: "Industrial Steel Gear",
      code: "SG-001",
      description: "High-grade carbon steel gear for heavy machinery.",
    },
    {
      name: "Aluminum Housing Unit",
      code: "AH-X2",
      description: "Lightweight aerospace-grade aluminum casing.",
    },
    {
      name: "Reinforced Brass Valve",
      code: "BV-PRO",
      description: "Corrosion-resistant brass valve for fluid control.",
    },
  ];

  console.log("--- Seeding Designs ---");

  for (const design of designs) {
    await prisma.design.upsert({
      where: { code: design.code },
      update: {}, // Don't change if it already exists
      create: design,
    });
  }

  console.log(`✅ Seeded ${designs.length} designs.`);
}

async function main() {
  console.log('--- Starting StockFlow Seed ---')

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { code: 'SF' },
    update: {},
    create: {
      name: 'StockFlow Manufacturing',
      code: 'SF',
    }
  });

  // 2. Create Branches
  const branches = [
    { name: 'Mombasa Branch', code: 'MSA', location: 'Mombasa', organizationId: org.id },
    { name: 'Nairobi Branch', code: 'NBO', location: 'Nairobi', organizationId: org.id },
    { name: 'Bunje Branch', code: 'BNJ', location: 'Bunje', organizationId: org.id },
  ];

  const seededBranches = [];
  for (const branch of branches) {
    const b = await prisma.branch.upsert({
      where: { code: branch.code },
      update: { location: branch.location },
      create: branch,
    });
    seededBranches.push(b);
  }
  console.log('✅ Branches seeded:', seededBranches.map(b => b.name).join(', '));

  const defaultBranchId = seededBranches[0].id;

  // 3. Create admin user directly in Prisma (skipping Supabase Auth)
  const adminId = randomUUID()
  const admin = await prisma.user.upsert({
    where: { email: 'sebby@admin.com' },
    update: {
      role: 'ADMIN',
      name: 'Sebby Admin',
      organizationId: org.id,
      branchId: defaultBranchId,
    },
    create: {
      id: adminId,
      email: 'sebby@admin.com',
      name: 'Sebby Admin',
      password: hashPassword('password123'),
      role: 'ADMIN',
      organizationId: org.id,
      branchId: defaultBranchId,
    },
  })

  console.log('✅ Admin user created/updated:', admin.email)

  // 4. Create sales user directly in Prisma
  const salesId = randomUUID()
  const sales = await prisma.user.upsert({
    where: { email: 'sales@stockflow.com' },
    update: {
      role: 'SALES',
      name: 'Sales User',
      organizationId: org.id,
      branchId: defaultBranchId,
    },
    create: {
      id: salesId,
      email: 'sales@stockflow.com',
      name: 'Sales User',
      password: hashPassword('password123'),
      role: 'SALES',
      organizationId: org.id,
      branchId: defaultBranchId,
    },
  })

  console.log('✅ Sales user created/updated:', sales.email)
  console.log('📝 Default password: password123')

  await seedDesigns()
  console.log('--- Seed Finished Successfully ---')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })