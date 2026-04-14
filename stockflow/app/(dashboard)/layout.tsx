'use client'

import { useRouter } from "next/navigation";
import { getUser, Role } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const u = await getUser();
      if (!u) {
        router.push("/login");
      } else {
        setUser(u);
      }
    };
    fetchUser();
  }, [router]);

  if (!user) {
    return <div>Loading...</div>;
  }

  const role = user.role as Role;
  const [previewRole, setPreviewRole] = useState<Role>(role);

  // Handle role switching (for preview purposes)
  useEffect(() => {
    // In a real app, this might come from a cookie or local storage
    // For now, we'll default to the user's actual role
    setPreviewRole(role);
  }, [role]);

  return (
    <div className="app">
      <Sidebar role={previewRole} userName={user.name} />
      <div className="main">
        <div className="topbar">
          <span className="topbar-preview-label">
            Preview role:
          </span>
          <div className="topbar-role-switcher">
            <button
              className={`role-btn ${previewRole === "ADMIN" ? "active" : ""}`}
              onClick={() => setPreviewRole("ADMIN")}
            >
              Admin
            </button>
            <button
              className={`role-btn ${previewRole === "MANAGER" ? "active" : ""}`}
              onClick={() => setPreviewRole("MANAGER")}
            >
              Manager
            </button>
            <button
              className={`role-btn ${previewRole === "OPERATOR" ? "active" : ""}`}
              onClick={() => setPreviewRole("OPERATOR")}
            >
              Operator
            </button>
            <button
              className={`role-btn ${previewRole === "SALES" ? "active" : ""}`}
              onClick={() => setPreviewRole("SALES")}
            >
              Sales
            </button>
            <button
              className={`role-btn ${previewRole === "PACKAGING" ? "active" : ""}`}
              onClick={() => setPreviewRole("PACKAGING")}
            >
              Packaging
            </button>
            <button
              className={`role-btn ${previewRole === "WAREHOUSE" ? "active" : ""}`}
              onClick={() => setPreviewRole("WAREHOUSE")}
            >
              Warehouse
            </button>
          </div>
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