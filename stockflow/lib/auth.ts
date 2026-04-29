import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase-admin";
import type { UserRole } from "./types";

export type { UserRole as Role };

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
      branchId: null,
    };
  }

  if (!token) return null;

  try {
    // Get user from Supabase
    const { data: { user }, error } = await supabaseServer().auth.getUser(token);

    if (error || !user) {
      return null;
    }

    // Get profile from profiles table
    const { data: profile, error: profileError } = await supabaseServer()
      .from('profiles')
      .select('email, name, role, department, branch_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return null;
    }

    return {
      id: user.id,
      email: profile.email,
      name: profile.name,
      role: profile.role as Role,
      department: profile.department,
      branchId: profile.branch_id,
    };

  } catch (error) {
    console.error("Error getting user:", error);
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