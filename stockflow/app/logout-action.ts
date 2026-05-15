"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from '@supabase/ssr';
import { clearAuthCookies } from "@/lib/auth-session";

/**
 * Logout server action - handles Supabase signout and cookie clearing
 * This is isolated to prevent auth.ts from being bundled into client code
 */
export async function performLogout() {
  try {
    const cookieStore = await cookies();
    
    // Create Supabase client for signout
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          setAll(cookiesToSet: any[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set({ name, value, ...options });
            });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );
    
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Logout error:", error);
  }

  // Clear all cookies
  const cookieStore = await cookies();
  clearAuthCookies(cookieStore);

  redirect("/login");
}
