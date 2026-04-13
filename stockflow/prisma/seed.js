const { PrismaClient } = require('@prisma/client')
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const { scryptSync, randomBytes } = require('crypto')

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Create adapter with the pool
const adapter = new PrismaPg(pool)

// Create PrismaClient with the adapter
const prisma = new PrismaClient({
  adapter,
})

// Simple password hashing function
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

async function main() {
  console.log('--- Starting StockFlow Seed ---')
  
  // Hash the password
  const hashedPassword = hashPassword('password123')
  
  const admin = await prisma.user.upsert({
    where: { email: 'sebby@admin.com' },
    update: {
      role: 'ADMIN',
      password: hashedPassword,
    },
    create: {
      email: 'sebby@admin.com',
      name: 'Sebby Admin',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  console.log('✅ Admin user created/updated:', admin.email)
  console.log('📝 Default password: password123')
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
