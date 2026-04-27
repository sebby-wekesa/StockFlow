import { PrismaClient } from '@prisma/client'
import { Role } from './auth'

export async function getUserFromDb(token: string) {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
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
