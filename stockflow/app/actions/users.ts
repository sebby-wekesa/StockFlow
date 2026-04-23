"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function inviteUser(data: { name: string; email: string; role: string; branchId: string }) {
  try {
    const { name, email, role, branchId } = data;

    if (!email || !name || !role || !branchId) {
      return { success: false, error: "All fields are required" };
    }

    // 1. Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: "tempPassword123!", // Temporary password, user should change
      email_confirm: true,
      user_metadata: {
        name,
        branchId,
      }
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
         return { success: false, error: "User with this email already exists." };
      }
      throw new Error(`Auth Error: ${authError.message}`);
    }

    // 2. Create corresponding record in Prisma
    await prisma.user.create({
      data: {
        id: authUser.user!.id,
        email,
        name,
        password: "", // Password handled by Supabase
        role: role as any,
        branchId,
      },
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("Invite Error:", error);
    return { success: false, error: "Failed to invite user." };
  }
}

export async function updateUserRole(userId: string, newRole: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole as any }
  });

  revalidatePath('/admin/users'); // Refresh the UI immediately
}

export async function deleteUser(userId: string) {
  // Delete from Supabase Auth
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authError) {
    throw new Error(`Failed to delete from auth: ${authError.message}`);
  }

  // Delete from Prisma
  await prisma.user.delete({
    where: { id: userId },
  });

  revalidatePath("/admin/users");
}

export async function getBranches() {
  return await prisma.branch.findMany({
    orderBy: { name: 'asc' }
  });
}