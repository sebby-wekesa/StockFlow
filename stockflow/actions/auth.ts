"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";

const ROLE_PATHS = {
  ADMIN: "/admin/dashboard",
  MANAGER: "/dashboard",
  WAREHOUSE: "/dashboard",
  SALES: "/dashboard",
  ACCOUNTANT: "/reports",
  OPERATOR: "/dashboard",
  PACKAGING: "/dashboard",
  PENDING: "/dashboard/setup",
};

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}

function getAuthErrorMessage(error: unknown) {
  const message = readErrorMessage(error);

  if (message.includes('Invalid login credentials')) {
    return "Invalid email or password. Please try again.";
  }
  if (message.includes('Email not confirmed')) {
    return "Please check your email and confirm your account.";
  }
  return "Authentication failed. Please try again.";
}

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

  const { data, error } = await supabase.auth.signInWithPassword({
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

  if (!data.session) {
    return { error: "Authentication failed. Please try again." };
  }

  // Middleware will handle cookie setting and redirects
  // Just return success - the page will redirect via middleware
  return { success: true };
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
  clearAuthCookies(cookieStore);

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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || '',
          role: 'OPERATOR', // Default role for new signups
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

    if (!data.session) {
      return {
        message: "Account created successfully. Please check your email and sign in to continue.",
      };
    }

    // Create profile record in database if it doesn't exist
    await prisma.profiles.upsert({
      where: { id: data.user.id },
      update: {},
      create: {
        id: data.user.id,
        email: data.user.email!,
        full_name: data.user.user_metadata?.name || name || '',
        role: 'PENDING', // Default role for new signups
      },
    });

    // Create User record
    await prisma.user.upsert({
      where: { email: data.user.email! },
      update: {},
      create: {
        id: data.user.id,
        email: data.user.email!,
        name: data.user.user_metadata?.name || name || '',
        role: 'PENDING', // Default role
      },
    });

    // Middleware will handle cookie setting and redirects
    return { success: true };

  } catch (error) {
    console.error("Sign up error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}
