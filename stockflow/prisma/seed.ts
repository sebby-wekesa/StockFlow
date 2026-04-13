import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { scryptSync, randomBytes } from 'crypto'

const { Pool } = pg

// Create connection pool
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

// Create PrismaClient with adapter
const prisma = new PrismaClient({ adapter })

// Simple password hashing function
function hashPassword(password: string): string {
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