import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const prismaClientSingleton = () => {
  if (!process.env.DIRECT_URL) {
    throw new Error('DIRECT_URL environment variable is required')
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }),
    log: ['error'],
  })
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma