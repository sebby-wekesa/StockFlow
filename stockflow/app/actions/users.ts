"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeUserRole, USER_ROLES } from "@/lib/types";

async function assertAdminAccess() {
  const currentUser = await getUser();

  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  if (currentUser.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
}

export async function inviteUser(data: { name: string; email: string; role: string; branchId: string }) {
  try {
    await assertAdminAccess();

    const { name, email, role, branchId } = data;

    if (!email || !name || !role || !branchId) {
      return { success: false, error: "All fields are required" };
    }

    if (typeof role !== "string" || !USER_ROLES.includes(role.toUpperCase() as typeof USER_ROLES[number])) {
      return { success: false, error: "Invalid role" };
    }

    const normalizedRole = normalizeUserRole(role);

    // 1. Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: "tempPassword123!", // Temporary password, user should change
      email_confirm: true,
      user_metadata: {
        name,
        branchId,
        role: normalizedRole,
      }
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
         return { success: false, error: "User with this email already exists." };
      }
      throw new Error(`Auth Error: ${authError.message}`);
    }

    // 2. Update profile in Supabase (trigger will create it, but we need to set role and department)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        name,
        role: normalizedRole,
        branch_id: branchId,
      })
      .eq('id', authUser.user!.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
      // Don't fail the whole operation, profile might be created by trigger
    }

    revalidatePath("/admin/users");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("Invite Error:", error);
    return { success: false, error: "Failed to invite user." };
  }
}

export async function updateUserRole(userId: string, newRole: string) {
  await assertAdminAccess();

  if (typeof newRole !== "string" || !USER_ROLES.includes(newRole.toUpperCase() as typeof USER_ROLES[number])) {
    throw new Error("Invalid role");
  }

  const normalizedRole = normalizeUserRole(newRole);

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ role: normalizedRole })
    .eq('id', userId);

  if (error) {
    console.error("Role update error:", error);
    throw new Error("Failed to update user role");
  }

  revalidatePath('/admin/users'); // Refresh the UI immediately
}

export async function deleteUser(userId: string) {
  await assertAdminAccess();

  // First delete related records that reference this user
  await prisma.auditLog.deleteMany({
    where: { userId },
  });

  await prisma.stageLog.deleteMany({
    where: { operatorId: userId },
  });

  await prisma.notificationSettings.deleteMany({
    where: { userId },
  });

  // Delete from Supabase profiles table
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (profileError) {
    console.error("Profile delete error:", profileError);
  }

  try {
    // Delete from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      throw new Error(`Failed to delete from auth: ${authError.message}`);
    }

    revalidatePath("/admin/users");
  } catch (error) {
    console.error("Delete user error:", error);
    throw error;
  }
}

export async function getBranches() {
  return await prisma.branch.findMany({
    orderBy: { name: 'asc' }
  });
}
