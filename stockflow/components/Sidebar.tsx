import Link from "next/link";
import { Role } from "@/lib/auth";

const roleNavItems: Record<Role, { label: string; href: string; icon: string }[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/dashboard", icon: "◉" },
    { label: "Orders", href: "/orders", icon: "◫" },
    { label: "Designs", href: "/designs", icon: "◈" },
    { label: "Users", href: "/users", icon: "◧" },
    { label: "Reports", href: "/reports", icon: "◩" },
  ],
  MANAGER: [
    { label: "Dashboard", href: "/dashboard", icon: "◉" },
    { label: "Pending Approvals", href: "/approvals", icon: "◫" },
    { label: "Designs", href: "/designs", icon: "◈" },
    { label: "Reports", href: "/reports", icon: "◩" },
  ],
  OPERATOR: [
    { label: "My Queue", href: "/dashboard", icon: "◉" },
    { label: "Active Jobs", href: "/jobs", icon: "◫" },
  ],
  SALES: [
    { label: "Dashboard", href: "/dashboard", icon: "◉" },
    { label: "Inventory", href: "/inventory", icon: "◫" },
    { label: "Orders", href: "/sales/orders", icon: "◈" },
  ],
  PACKAGING: [
    { label: "Dashboard", href: "/dashboard", icon: "◉" },
    { label: "Packaging Queue", href: "/packaging", icon: "◫" },
  ],
};

export function Sidebar({ role, userName }: { role: Role; userName: string | null }) {
  const navItems = roleNavItems[role];

  return (
    <aside className="w-64 min-h-screen bg-zinc-900 text-zinc-100 flex flex-col">
      <div className="p-4 border-b border-zinc-800">
        <h1 className="text-xl font-bold tracking-tight">StockFlow</h1>
        <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">
          {role.toLowerCase()}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-500 truncate">{userName || "User"}</p>
      </div>
    </aside>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  const colors: Record<Role, string> = {
    ADMIN: "bg-red-900 text-red-200",
    MANAGER: "bg-amber-900 text-amber-200",
    OPERATOR: "bg-blue-900 text-blue-200",
    SALES: "bg-green-900 text-green-200",
    PACKAGING: "bg-purple-900 text-purple-200",
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[role]}`}>
      {role}
    </span>
  );
}