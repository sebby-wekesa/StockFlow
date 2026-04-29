"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/types";
import { ROLE_NAMES, ROLE_COLORS } from "@/lib/types";
import { signOut } from "@/actions/auth";

// Generate role-specific navigation items
function getRoleNavItems(role: UserRole): any[] {
  // Common navigation for all roles
  const commonItems = [
    { section: "Account" },
    { label: "Profile", href: "/profile" },
    { label: "Settings", href: "/settings" },
  ];

  // Role-specific navigation
  switch (role) {
    case 'PENDING':
      return [
        { section: "Account Setup" },
        { label: "Complete profile", href: "/profile" },
      ];

    case 'ADMIN':
      return [
        { section: "Overview" },
        { label: "Dashboard", href: "/dashboard" },
        { section: "Production" },
        { label: "Design templates", href: "/designs" },
        { label: "Production orders", href: "/orders", badge: "4" },
        { label: "Departments", href: "/departments" },
        { section: "Inventory" },
        { label: "Raw materials", href: "/rawmaterials" },
        { label: "Finished goods", href: "/finishedgoods" },
        { section: "Sales" },
        { label: "Sales orders", href: "/sales", badge: "2" },
        { label: "Packaging queue", href: "/packaging" },
        { section: "Settings" },
        { label: "Users & roles", href: "/admin/users" },
      ];

    case 'MANAGER':
      return [
        { section: "Overview" },
        { label: "Dashboard", href: "/dashboard" },
        { section: "Approvals" },
        { label: "Order approvals", href: "/approvals", badge: "3", badgeColor: "red" },
        { section: "Production" },
        { label: "All orders", href: "/orders" },
        { label: "Dept queues", href: "/departments" },
        { section: "Reports" },
        { label: "Scrap report", href: "/scrap" },
        { label: "Raw materials", href: "/rawmaterials" },
      ];

    case 'OPERATOR':
      return [
        { section: "My Work" },
        { label: "Job queue", href: "/operator_queue", badge: "3", badgeColor: "purple" },
        { label: "Log output", href: "/operator_log" },
        { section: "History" },
        { label: "Completed jobs", href: "/operator_history" },
      ];

    case 'SALES':
      return [
        { section: "Catalogue" },
        { label: "Available stock", href: "/catalogue" },
        { label: "Place order", href: "/place_order" },
        { section: "My Orders" },
        { label: "Order history", href: "/my_orders" },
      ];

    case 'PACKAGING':
      return [
        { section: "Fulfilment" },
        { label: "Pending orders", href: "/packaging", badge: "5", badgeColor: "purple" },
        { label: "Fulfilled today", href: "/pack_done" },
      ];

    case 'WAREHOUSE':
      return [
        { section: "Overview" },
        { label: "Dashboard", href: "/dashboard" },
        { section: "Receiving" },
        { label: "Receive stock", href: "/receive" },
        { label: "Stock levels", href: "/rawmaterials" },
      ];

    default:
      return commonItems;
  }
}

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const navItems = getRoleNavItems(role);
  const roleColor = ROLE_COLORS[role];
  const roleNameDisplay = ROLE_NAMES[role];

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
        
        <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
          <form action={signOut} style={{ display: 'block', width: '100%' }}>
            <button 
              type="submit"
              className="nav-item" 
              style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: '#fbbf24', marginTop: '20px' }}
            >
              <span className="nav-dot" style={{ background: '#fbbf24' }}></span>
              Log out
            </button>
          </form>
        </div>
      </nav>
    </div>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  const colors: Record<Role, string> = {
    PENDING: "badge-muted",
    ADMIN: "badge-amber",
    MANAGER: "badge-amber",
    OPERATOR: "badge-purple",
    SALES: "badge-teal",
    PACKAGING: "badge-green",
    WAREHOUSE: "badge-muted",
  };

  return (
    <span className={`badge ${colors[role]}`}>
      {role}
    </span>
  );
}