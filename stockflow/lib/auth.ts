import { cookies } from "next/headers";

export type Role = "PENDING" | "ADMIN" | "MANAGER" | "OPERATOR" | "SALES" | "PACKAGING" | "WAREHOUSE";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  department: string | null;
  branchId: string | null;
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

  // Only import and use prisma if needed
  const { getUserFromDb } = await import('./db-user')
  return getUserFromDb(token)
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

export async function checkRole(user: AuthUser | null, ...roles: Role[]): Promise<boolean> {
  if (!user) return false;
  return roles.includes(user.role);
}