import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "./prisma";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;

  if (!token) return null;

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
  });

  return dbUser;
}

export type Role = "ADMIN" | "MANAGER" | "OPERATOR" | "SALES" | "PACKAGING";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  department: string | null;
};

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