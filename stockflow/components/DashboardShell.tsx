"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";
import { Role } from "@/lib/auth";

export function DashboardShell({
  user,
  children,
}: {
  user: any;
  children: React.ReactNode;
}) {
  const role = user.role as Role;
  const [previewRole, setPreviewRole] = useState<Role>(role);

  // Handle role switching (for preview purposes)
  useEffect(() => {
    setPreviewRole(role);
  }, [role]);

  const handleRoleSwitch = async (newRole: Role) => {
    try {
      // Update the DB so the server-side checks pass
      const response = await fetch('/api/user/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        // Update the preview role immediately
        setPreviewRole(newRole);
        // Hard refresh to trigger the Middleware/Layout guards again
        window.location.reload();
      } else {
        console.error('Failed to update role');
      }
    } catch (error) {
      console.error('Role switch error:', error);
    }
  };

  return (
    <ToastProvider>
      <div className="app">
        <Sidebar user={{ role: previewRole, name: user.name || '' }} />
        <div className="main">
          <div className="topbar">
            <span style={{fontSize:'11px', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'1px'}}>Preview role:</span>
            <div className="topbar-role-switcher">
              {role === "ADMIN" && (
                <button
                  className={`role-btn ${previewRole === "ADMIN" ? "active" : ""}`}
                  onClick={() => handleRoleSwitch("ADMIN")}
                >
                  Admin
                </button>
              )}
              {role === "MANAGER" && (
                <button
                  className={`role-btn ${previewRole === "MANAGER" ? "active" : ""}`}
                  onClick={() => handleRoleSwitch("MANAGER")}
                >
                  Manager
                </button>
              )}
              {role === "OPERATOR" && (
                <button
                  className={`role-btn ${previewRole === "OPERATOR" ? "active" : ""}`}
                  onClick={() => handleRoleSwitch("OPERATOR")}
                >
                  Operator
                </button>
              )}
              {role === "SALES" && (
                <button
                  className={`role-btn ${previewRole === "SALES" ? "active" : ""}`}
                  onClick={() => handleRoleSwitch("SALES")}
                >
                  Sales
                </button>
              )}
              {role === "PACKAGING" && (
                <button
                  className={`role-btn ${previewRole === "PACKAGING" ? "active" : ""}`}
                  onClick={() => handleRoleSwitch("PACKAGING")}
                >
                  Packaging
                </button>
              )}
              {role === "WAREHOUSE" && (
                <button
                  className={`role-btn ${previewRole === "WAREHOUSE" ? "active" : ""}`}
                  onClick={() => handleRoleSwitch("WAREHOUSE")}
                >
                  Warehouse
                </button>
              )}
            </div>
            <div className="topbar-right">
              <div className="notif-dot pulse"></div>
              <div className="avatar">
                {user.name ? user.name.slice(0, 2).toUpperCase() : "U"}
              </div>
            </div>
          </div>
          <div className="content">{children}</div>
        </div>
      </div>
    </ToastProvider>
  );
}
