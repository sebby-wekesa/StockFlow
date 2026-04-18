"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { scryptSync } from "crypto";

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  const testHash = scryptSync(password, salt, 64).toString("hex");
  return hash === testHash;
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
  const user = await prisma.user.findUnique({
    where: { email: validation.data.email },
  });

  if (!user || !verifyPassword(validation.data.password, user.password)) {
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
  let redirectPath = '/operator/queue'; // default
  if (user.role === 'ADMIN') {
    redirectPath = '/admin/dashboard';
  } else if (user.role === 'OPERATOR') {
    redirectPath = '/operator';
  }
  // WAREHOUSE and SALES stay on /operator/queue for now
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
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "User already exists" };
  }

  // Hash password
  const importCrypto = await import("crypto");
  const salt = importCrypto.randomBytes(16).toString("hex");
  const hash = importCrypto.scryptSync(password, salt, 64).toString("hex");
  const storedHash = `${salt}:${hash}`;

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: storedHash,
      name: name || undefined,
      department: department || undefined,
      role: "OPERATOR",
    },
  });

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

  redirect("/operator"); // Operators go to their dashboard
}
