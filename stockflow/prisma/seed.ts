import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

  // Create user in Supabase Auth
  let authUserId: string

  const { data: authUser, error } = await supabaseAdmin.auth.admin.createUser({
    email: 'sebby@admin.com',
    password: 'password123',
    email_confirm: true, // Auto-confirm the email
  })

  if (error) {
    if (error.message === 'A user with this email address has already been registered' || (error as any).code === 'email_exists') {
      console.log('ℹ️ Admin user already exists in Supabase Auth, fetching ID...')
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (listError) throw listError
      const existingUser = users.find(u => u.email === 'sebby@admin.com')
      if (!existingUser) throw new Error('Could not find existing user in Supabase')
      authUserId = existingUser.id
    } else {
      console.error('❌ Error creating Supabase user:', error)
      throw error
    }
  } else {
    authUserId = authUser.user!.id
    console.log('✅ Supabase user created:', authUser.user?.email)
  }

  // Create corresponding record in Prisma
  const admin = await prisma.user.upsert({
    where: { email: 'sebby@admin.com' },
    update: {
      role: 'ADMIN',
      name: 'Sebby Admin',
    },
    create: {
      id: authUserId, // Use Supabase user ID
      email: 'sebby@admin.com',
      name: 'Sebby Admin',
      password: 'password123', // Password handled by Supabase
      role: 'ADMIN',
    },
  })

  console.log('✅ Prisma user created/updated:', admin.email)

  // Create sales user
  let salesAuthUserId: string

  const { data: salesAuthUser, error: salesError } = await supabaseAdmin.auth.admin.createUser({
    email: 'sales@stockflow.com',
    password: 'password123',
    email_confirm: true,
  })

  if (salesError) {
    if (salesError.message === 'A user with this email address has already been registered' || (salesError as any).code === 'email_exists') {
      console.log('ℹ️ Sales user already exists in Supabase Auth, fetching ID...')
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (listError) throw listError
      const existingUser = users.find(u => u.email === 'sales@stockflow.com')
      if (!existingUser) throw new Error('Could not find existing sales user in Supabase')
      salesAuthUserId = existingUser.id
    } else {
      console.error('❌ Error creating sales Supabase user:', salesError)
      throw salesError
    }
  } else {
    salesAuthUserId = salesAuthUser.user!.id
    console.log('✅ Supabase sales user created:', salesAuthUser.user?.email)
  }

  const sales = await prisma.user.upsert({
    where: { email: 'sales@stockflow.com' },
    update: {
      role: 'SALES',
      name: 'Sales User',
    },
    create: {
      id: salesAuthUserId,
      email: 'sales@stockflow.com',
      name: 'Sales User',
      password: 'password123', // Placeholder, actual auth via Supabase
      role: 'SALES',
    },
  })

  console.log('✅ Prisma sales user created/updated:', sales.email)
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