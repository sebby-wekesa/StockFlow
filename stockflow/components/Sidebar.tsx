"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@/lib/auth";

type NavItem = {
  section?: string;
  label?: string;
  href?: string;
  badge?: string;
  badgeColor?: string;
};

const roleColors: Record<Role, string> = {
  ADMIN: "var(--accent)",
  MANAGER: "var(--accent)",
  OPERATOR: "var(--purple)",
  SALES: "var(--teal)",
  PACKAGING: "var(--green)",
};

const roleNames: Record<Role, string> = {
  ADMIN: "Admin / Owner",
  MANAGER: "Production Manager",
  OPERATOR: "Operator",
  SALES: "Sales Team",
  PACKAGING: "Packaging Team",
};

const roleNavItems: Record<Role, NavItem[]> = {
  ADMIN: [
    { section: "Overview" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Yield Analytics", href: "/analytics" },
    { section: "Production" },
    { label: "Design templates", href: "/designs" },
    { label: "Production orders", href: "/orders" },
    { section: "Inventory" },
    { label: "Inventory", href: "/inventory" },
    { section: "Settings" },
    { label: "Users & roles", href: "/users" },
  ],
  MANAGER: [
    { section: "Overview" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Yield Analytics", href: "/analytics" },
    { section: "Approvals" },
    { label: "Order approvals", href: "/approvals" },
    { section: "Production" },
    { label: "All orders", href: "/orders" },
    { label: "Design templates", href: "/designs" },
  ],
  OPERATOR: [
    { section: "My Work" },
    { label: "Dashboard Queue", href: "/dashboard" },
    { label: "Active Jobs", href: "/jobs" },
  ],
  SALES: [
    { section: "Catalogue" },
    { label: "Available stock", href: "/inventory" },
    { section: "My Orders" },
    { label: "Order history", href: "/orders" },
  ],
  PACKAGING: [
    { section: "Fulfilment" },
    { label: "Dashboard", href: "/dashboard" },
  ],
};

export function Sidebar({ role, userName }: { role: Role; userName: string | null }) {
  const pathname = usePathname();
  const navItems = roleNavItems[role];
  const roleColor = roleColors[role];
  const roleNameDisplay = roleNames[role];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">StockFlow</div>
        <div className="logo-sub">Manufacturing Platform</div>
      </div>
      <div className="role-badge">
        <div className="role-label">Signed in as</div>
        <div className="role-name" style={{ color: roleColor }}>
          {roleNameDisplay}
        </div>
      </div>
      <nav className="nav">
        {navItems.map((item, i) => {
          if (item.section) {
            return (
              <div key={`section-${i}`} className="nav-section">
                {item.section}
              </div>
            );
          }

          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const bc = item.badgeColor ? ` ${item.badgeColor}` : "";
          const badge = item.badge ? <span className={`nav-badge${bc}`}>{item.badge}</span> : null;

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <span className="nav-dot"></span>
              {item.label}
              {badge}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  const colors: Record<Role, string> = {
    ADMIN: "badge-amber",
    MANAGER: "badge-amber",
    OPERATOR: "badge-purple",
    SALES: "badge-teal",
    PACKAGING: "badge-green",
  };

  return (
    <span className={`badge ${colors[role]}`}>
      {role}
    </span>
  );
}