import { cookies } from "next/headers";
import { prisma } from "./prisma";

export type Role = "ADMIN" | "MANAGER" | "OPERATOR" | "SALES" | "PACKAGING" | "WAREHOUSE";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  department: string | null;
};

export async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  const demoLoggedIn = cookieStore.get("demo-logged-in")?.value;

  if (!token && demoLoggedIn === "true") {
    // Demo mode: return mock user
    return {
      id: "demo-user",
      email: "demo@stockflow.com",
      name: "Demo User",
      role: "ADMIN" as Role,
      department: null,
    };
  }

  if (!token) return null;

  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    return user;
  } catch (error) {
    return null;
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user as AuthUser;
}

export async function requireRole(...roles: Role[]): Promise<AuthUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new Error("Forbidden: Insufficient permissions");
  }
  return user;
}