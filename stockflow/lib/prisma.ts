import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const databaseUrl = process.env.DATABASE_URL

function getConnectionString(url: string) {
  const parsed = new URL(url)

  // Prisma 7's pg adapter uses node-postgres semantics. Preserve the
  // expected libpq behavior for existing `sslmode=require` URLs.
  if (parsed.searchParams.get('sslmode') === 'require' && !parsed.searchParams.has('uselibpqcompat')) {
    parsed.searchParams.set('uselibpqcompat', 'true')
  }

  return parsed.toString()
}

// 1. Define the singleton function
const prismaClientSingleton = () => {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured')
  }

  const adapter = new PrismaPg({ connectionString: getConnectionString(databaseUrl) })

  return new PrismaClient({ adapter })
}

// 2. Setup the global type for development hot-reloading
type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

// 3. Export the instance
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

// 4. Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
