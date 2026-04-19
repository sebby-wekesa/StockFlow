"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateUserRole(formData: FormData) {
  const userId = formData.get('userId') as string;
  const newRole = formData.get('newRole') as string;

  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole as any }
  });

  revalidatePath('/admin/users'); // Refresh the UI immediately
}