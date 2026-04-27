import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () =>
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  })

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
