"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { loginSchema } from "@/lib/validations";
import { ROLE_HOME_PAGES, type UserRole } from "@/types/auth";
import { ROLE_PATHS } from "@/lib/types";

function getAuthErrorMessage(error: any) {
  if (error?.message?.includes('Invalid login credentials')) {
    return "Invalid email or password. Please try again.";
  }
  if (error?.message?.includes('Email not confirmed')) {
    return "Please check your email and confirm your account.";
  }
  return "Authentication failed. Please try again.";
}

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Debug: Check if environment variables are loading
  console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL); // Check if this is undefined
  console.log("KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Loaded" : "Missing");

  // Validate input
  const validation = loginSchema.safeParse({ email, password });

  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    const firstError = errors.email?.[0] || errors.password?.[0] || "Invalid input";
    return { error: firstError };
  }

  try {
    // Sign in with Supabase
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: validation.data.email,
      password: validation.data.password,
    });

    if (error) {
      console.error("Supabase auth error:", error);
      return { error: getAuthErrorMessage(error) };
    }

    if (!data.user) {
      return { error: "Authentication failed. Please try again." };
    }

    // Get user profile from profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, department, branch_id')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return { error: "Failed to load user profile. Please contact support." };
    }

    // Create session cookies
    const cookieStore = await cookies();

    // Set auth token for session management
    cookieStore.set("auth-token", data.session?.access_token || "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Set refresh token
    cookieStore.set("refresh-token", data.session?.refresh_token || "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Set user-role cookie for middleware (from profile)
    cookieStore.set("user-role", profile.role || "PENDING", {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Redirect based on role
    const redirectPath = ROLE_PATHS[profile.role as UserRole] || '/dashboard';
    redirect(redirectPath);

  } catch (error) {
    console.error("Sign in error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}

export async function signOut() {
  try {
    // Sign out from Supabase
    await supabaseAdmin.auth.signOut();
  } catch (error) {
    console.error("Supabase signout error:", error);
  }

  // Clear all cookies
  const cookieStore = await cookies();
  cookieStore.delete("auth-token");
  cookieStore.delete("refresh-token");
  cookieStore.delete("user-role");
  cookieStore.delete("demo-logged-in");

  redirect("/login");
}

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    // Create user with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || '',
        }
      }
    });

    if (error) {
      console.error("Supabase signup error:", error);
      if (error.message.includes('already registered')) {
        return { error: "User with this email already exists." };
      }
      return { error: getAuthErrorMessage(error) };
    }

    if (!data.user) {
      return { error: "Failed to create account. Please try again." };
    }

    // The profile will be automatically created by the database trigger
    // Redirect to login or dashboard based on email confirmation setting
    redirect('/login?message=Check your email to confirm your account');

  } catch (error) {
    console.error("Sign up error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}
