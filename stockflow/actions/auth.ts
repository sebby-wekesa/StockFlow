"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { scryptSync } from "crypto";
import { Prisma } from "@prisma/client";
import { ROLE_HOME_PAGES, type UserRole } from "@/types/auth";

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  const testHash = scryptSync(password, salt, 64).toString("hex");
  return hash === testHash;
}

function getDatabaseErrorMessage(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientRustPanicError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    return "We couldn't reach the database right now. Please try again in a moment."
  }

  return null
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

  // Find user in database
  let user;

  try {
    user = await prisma.user.findUnique({
      where: { email: validation.data.email },
    });
  } catch (error) {
    const message = getDatabaseErrorMessage(error)
    if (message) {
      console.error("Login database error:", error)
      return { error: message }
    }
    throw error
  }

  console.log("User found in DB:", user ? "YES" : "NO");

  if (user) {
    const isMatch = verifyPassword(validation.data.password, user.password);
    console.log("Password Match:", isMatch);
    if (!isMatch) {
      return { error: "Invalid email or password. Please try again." };
    }
  } else {
    return { error: "Invalid email or password. Please try again." };
  }

  // Create session cookie
  const cookieStore = await cookies();
  const sessionToken = Buffer.from(JSON.stringify({ 
    userId: user.id, 
    email: user.email,
    timestamp: Date.now()
  })).toString("base64");

  cookieStore.set("auth-token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  // Set user-role cookie for middleware
  cookieStore.set("user-role", user.role, {
    httpOnly: false, // Allow client-side access
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  // Redirect based on role
  const redirectPath = ROLE_HOME_PAGES[user.role as UserRole] || '/operator/queue';
  redirect(redirectPath);
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("auth-token");
  redirect("/login");
}

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const department = formData.get("department") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  // Check if user exists
  let existingUser;

  try {
    existingUser = await prisma.user.findUnique({
      where: { email },
    });
  } catch (error) {
    const message = getDatabaseErrorMessage(error)
    if (message) {
      console.error("Signup lookup database error:", error)
      return { error: message }
    }
    throw error
  }

  if (existingUser) {
    return { error: "User already exists" };
  }

  // Hash password
  const importCrypto = await import("crypto");
  const salt = importCrypto.randomBytes(16).toString("hex");
  const hash = importCrypto.scryptSync(password, salt, 64).toString("hex");
  const storedHash = `${salt}:${hash}`;

  // Create user
  let user;

  try {
    user = await prisma.user.create({
      data: {
        email,
        password: storedHash,
        name: name || undefined,
        department: department || undefined,
        role: "PENDING",
      },
    });
  } catch (error) {
    const message = getDatabaseErrorMessage(error)
    if (message) {
      console.error("Signup create database error:", error)
      return { error: message }
    }
    throw error
  }

  // Create session cookie
  const cookieStore = await cookies();
  const sessionToken = Buffer.from(JSON.stringify({ 
    userId: user.id, 
    email: user.email,
    timestamp: Date.now()
  })).toString("base64");

  cookieStore.set("auth-token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  cookieStore.set("user-role", user.role, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(ROLE_HOME_PAGES[user.role as UserRole] || '/operator');
}
