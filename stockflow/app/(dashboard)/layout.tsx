import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const demoLoggedIn = cookieStore.get("demo-logged-in")?.value;

  if (demoLoggedIn === "true") {
    // Demo mode: use mock user without calling getUser
    const user = {
      id: "demo-user",
      email: "demo@stockflow.com",
      name: "Demo User",
      role: "ADMIN",
      department: null,
    };
    return (
      <DashboardShell user={user}>
        {children}
      </DashboardShell>
    );
  }

  const user = await getUser();
  
  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardShell user={user}>
      {children}
    </DashboardShell>
  );
}