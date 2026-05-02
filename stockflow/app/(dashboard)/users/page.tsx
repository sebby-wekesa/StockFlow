export const dynamic = 'force-dynamic';
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

export default async function UsersPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/unauthorized");
  }

  redirect("/admin/users");
}
