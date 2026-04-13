import { redirect } from "next/navigation";
import { getUser, Role } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const role = user.role as Role;

  return (
    <div className="app">
      <Sidebar role={role} userName={user.name} />
      <div className="main">
        <div className="topbar">
          <div className="topbar-title">StockFlow</div>
          <div className="topbar-right">
            <div className="notif-dot pulse"></div>
            <div className="avatar">{user.name ? user.name.slice(0, 2).toUpperCase() : 'U'}</div>
          </div>
        </div>
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
}