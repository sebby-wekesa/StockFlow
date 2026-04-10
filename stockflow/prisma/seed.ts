import { PrismaClient } from '@prisma/client'

// Use the standard initialization
const prisma = new PrismaClient()

async function main() {
  console.log('--- Starting StockFlow Seed ---')
  
  const admin = await prisma.user.upsert({
    where: { email: 'sebby@admin.com' },
    update: {
      role: 'ADMIN',
    },
    create: {
      email: 'sebby@admin.com',
      name: 'Sebby Admin',
      role: 'ADMIN',
    },
  })

  console.log('✅ Admin user created/updated:', admin.email)
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