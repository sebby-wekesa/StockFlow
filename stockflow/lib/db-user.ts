import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Role } from './auth'
import { getPrismaConnectionString } from './prisma'

export async function getUserFromDb(token: string) {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: getPrismaConnectionString() }),
      log: ['error'],
    })
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });
    await prisma.$disconnect()
    return user as { id: string; email: string; name: string | null; role: Role; department: string | null; branchId: string | null } | null
  } catch {
    return null;
  }
}
