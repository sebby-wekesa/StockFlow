import { PrismaClient } from '@prisma/client'

// 1. Define the singleton function
const prismaClientSingleton = () => {
  return new PrismaClient()
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
