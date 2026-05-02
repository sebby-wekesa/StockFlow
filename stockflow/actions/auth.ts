"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { clearAuthCookies, getRoleHomePage, resolveUserRole, setAuthCookies } from "@/lib/auth-session";
import { loginSchema } from "@/lib/validations";

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

  const role = await resolveUserRole(data.user.id, data.user.user_metadata?.role);

  // Success - set cookies and redirect
  const cookieStore = await cookies();
  setAuthCookies(cookieStore, data.session, role);

  const redirectTo = getRoleHomePage(role);
  return { redirectTo };
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
    // We use the standard supabase client to allow the session to be established if email confirmation is off
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
        message: "Account created successfully. Please sign in to continue.",
      };
    }

    const role = await resolveUserRole(data.user.id, data.user.user_metadata?.role);
    const cookieStore = await cookies();
    setAuthCookies(cookieStore, data.session, role);

    return { redirectTo: getRoleHomePage(role) };

  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error; // Re-throw redirect errors so Next.js can handle them
    }
    console.error("Sign up error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}
