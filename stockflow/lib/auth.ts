import { cookies } from "next/headers";
import { supabaseServer } from "./supabase-admin";
import { type UserRole } from "./types";
import { prisma } from "./prisma";

export type Role = UserRole;

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  department: string | null;
  branchId: string | null;
};

export async function getUser() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("auth-token")?.value;

  console.log("--- GET USER CHECK ---");
  console.log("Cookies available:", cookieStore.getAll().length);

  if (!accessToken) {
    console.log("No auth token found.");
    return null;
  }

  const supabase = supabaseServer() as any;

  if (!supabase) {
    console.error("Missing Supabase server client");
    return null;
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    console.log("No user found:", error?.message);
    return null;
  }

  console.log("User found:", user.email);

  try {
    const metadataName =
      typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null;

    // Get user from Prisma database instead of Supabase profiles table
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        email: true,
        name: true,
        role: true,
        department: true,
        branchId: true,
        branches: {
          select: {
            id: true
          }
        }
      }
    });

    if (!dbUser) {
      console.log("User not found in database");
      return null;
    }

    return {
      id: user.id,
      email: dbUser.email ?? user.email ?? "",
      name: dbUser.name ?? metadataName ?? "",
      role: dbUser.role,
      department: dbUser.department ?? null,
      branchId: dbUser.branchId ?? dbUser.branches?.[0]?.id ?? null,
    };
  } catch (err) {
    console.error("Error getting user profile:", err);
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

export async function checkRole(user: AuthUser | null, ...roles: Role[]): Promise<boolean> {
  if (!user) return false;
  return roles.includes(user.role);
}
