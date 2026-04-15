import Link from "next/link";
import { LayoutDashboard, Settings, FileText, PlayCircle, History } from "lucide-react";

export function Sidebar({ user }: { user: { role: string, name: string } }) {
  const isAdmin = user.role === 'ADMIN';

  return (
    <nav className="flex flex-col gap-4 p-4 bg-[#0f1113] h-screen border-r border-[#1e2023]">
      <div className="mb-8">
        <h1 className="text-[#4caf7d] font-bold text-xl tracking-tighter">STOCKFLOW</h1>
        <p className="text-[10px] text-[#7a8090] uppercase">{user.role} VIEW</p>
      </div>

      {isAdmin ? (
        <>
          <NavItem icon={<LayoutDashboard />} label="Dashboard" href="/admin/dashboard" />
          <NavItem icon={<Settings />} label="Manage BOM" href="/admin/designs" />
          <NavItem icon={<FileText />} label="Reports" href="/admin/reports" />
        </>
      ) : (
        <>
          <NavItem icon={<PlayCircle />} label="My Queue" href="/operator/queue" />
          <NavItem icon={<History />} label="My Logs" href="/operator/history" />
        </>
      )}
    </nav>
  );
}

function NavItem({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-3 py-2 text-[#e8eaed] hover:bg-[#1e2023] rounded-md transition-colors">
      {icon}
      <span className="text-sm">{label}</span>
    </Link>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  const colors: Record<Role, string> = {
    ADMIN: "badge-amber",
    OPERATOR: "badge-purple",
    WAREHOUSE: "badge-green",
  };

  return (
    <span className={`badge ${colors[role]}`}>
      {role}
    </span>
  );
}