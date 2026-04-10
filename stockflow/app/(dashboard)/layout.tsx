import { redirect } from "next/navigation";
import { getUser, Role } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    select: { id: true, name: true, role: true },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const role = dbUser.role as Role;

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar role={role} userName={dbUser.name} />
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}