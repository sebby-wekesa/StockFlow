import { supabaseServerComponent } from "./supabase-admin";
import { prisma } from "./prisma";
import { type UserRole } from "./types";

export type Role = UserRole;

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  department: string | null;
  branches: { id: string; name: string }[];
};

export async function getUser() {
  const supabase = await supabaseServerComponent();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) return null;

  try {
    const profile = await prisma.public.Profile.findUnique({
      where: { id: authUser.id },
    });

    if (!profile) {
      console.log("User profile not found in database");
      return null;
    }

    return {
      id: authUser.id,
      email: profile.email ?? authUser.email ?? "",
      name: profile.full_name ?? authUser.user_metadata?.name ?? "",
      role: profile.role as UserRole ?? "OPERATOR",
      department: null, // Not available in profiles table
      branches: [], // Not available in profiles table
    };
  } catch (error) {
    console.error("Prisma lookup failed:", error);
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
