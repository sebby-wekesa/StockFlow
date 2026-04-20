"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

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