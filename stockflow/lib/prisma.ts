import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function normalizeConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString)
    const sslMode = url.searchParams.get('sslmode')

    // Keep current pg behavior explicit and silence the upcoming alias warning.
    if (sslMode && ['prefer', 'require', 'verify-ca'].includes(sslMode)) {
      url.searchParams.set('sslmode', 'verify-full')
      return url.toString()
    }

    return connectionString
  } catch {
    return connectionString
  }
}

export function getPrismaConnectionString() {
  const runtimeUrl = process.env.DATABASE_URL || process.env.DIRECT_URL

  if (!runtimeUrl) {
    throw new Error('DATABASE_URL or DIRECT_URL environment variable is required')
  }

  return normalizeConnectionString(runtimeUrl)
}

const prismaClientSingleton = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: getPrismaConnectionString() }),
    log: ['error'],
  })

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
