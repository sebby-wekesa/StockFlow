"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Validate input
  const validation = loginSchema.safeParse({ email, password });

  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    const firstError = errors.email?.[0] || errors.password?.[0] || "Invalid input";
    return { error: firstError };
  }

  // Attempt sign in
  const { data, error } = await supabase.auth.signInWithPassword({
    email: validation.data.email,
    password: validation.data.password,
  });

  if (error || !data.session) {
    // Provide user-friendly error messages
    if (error?.message?.includes("Invalid login credentials")) {
      return { error: "Invalid email or password. Please try again." };
    }
    if (error?.message?.includes("Email not confirmed")) {
      return { error: "Please verify your email before signing in." };
    }
    return { error: error?.message || "Sign in failed. Please try again." };
  }

  const cookieStore = await cookies();
  cookieStore.set("sb-access-token", data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  redirect("/dashboard");
}
