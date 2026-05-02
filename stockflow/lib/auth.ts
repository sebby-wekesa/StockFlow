import { cookies } from "next/headers";
import { supabaseServer } from "./supabase-admin";
import { normalizeUserRole, type UserRole } from "./types";

export type Role = UserRole;

type ProfileRow = {
  email: string | null;
  role: string | null;
  department: string | null;
  branch_id: string | null;
};

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

  const { data: { user }, error } = await supabase.auth.getUser(accessToken)

  if (error || !user) {
    console.log("No user found:", error?.message);
    return null;
  }

  console.log("User found:", user.email);

  try {
    const metadataName =
      typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null;

    // Get profile from profiles table
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('email, role, department, branch_id')
      .eq('id', user.id)
      .maybeSingle();

    const profile = (data ?? null) as ProfileRow | null;

    if (profileError) {
      console.error("Profile lookup failed:", profileError.message);
    }

    return {
      id: user.id,
      email: profile?.email ?? user.email ?? "",
      name: metadataName,
      role: normalizeUserRole(profile?.role ?? user.user_metadata?.role),
      department: profile?.department ?? null,
      branchId: profile?.branch_id ?? null,
    };

  } catch (error) {
    console.error("Error getting user profile:", error);
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
