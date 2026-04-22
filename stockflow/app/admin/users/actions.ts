"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function inviteUser(formData: FormData) {
  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  const role = formData.get("role") as string;

  if (!email || !name || !role) {
    throw new Error("All fields are required");
  }

  // Create user in Supabase Auth
  const { data: authUser, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: "tempPassword123!", // Temporary password, user should change
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  // Create corresponding record in Prisma
  await prisma.user.create({
    data: {
      id: authUser.user!.id,
      email,
      name,
      password: "", // Password handled by Supabase
      role: role as any,
    },
  });

  revalidatePath("/admin/users");
}
