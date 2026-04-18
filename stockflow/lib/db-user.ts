import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Role } from './auth'

export async function getUserFromDb(token: string) {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
      log: ['error'],
    })
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });
    await prisma.$disconnect()
    return user as { id: string; email: string; name: string | null; role: Role; department: string | null } | null
  } catch (error) {
    return null;
  }
}