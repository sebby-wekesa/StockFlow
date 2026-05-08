import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-admin";
import type { UserRole } from "@/lib/types";
import { ROLE_PATHS, normalizeUserRole } from "@/lib/types";

const PUBLIC_PATHS = new Set(["/login"]);

const ROLE_PROTECTIONS: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/manager", roles: ["MANAGER", "ADMIN"] },
  { prefix: "/operator", roles: ["OPERATOR", "ADMIN"] },
  { prefix: "/sales", roles: ["SALES", "ADMIN"] },
  { prefix: "/packaging", roles: ["PACKAGING", "ADMIN"] },
  { prefix: "/warehouse", roles: ["WAREHOUSE", "ADMIN"] },
  { prefix: "/approvals", roles: ["MANAGER", "ADMIN"] },
  { prefix: "/users", roles: ["ADMIN"] },
];



function isPublicPath(pathname: string) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/auth/") ||
    pathname.includes(".") ||
    PUBLIC_PATHS.has(pathname)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const supabase = supabaseServer(request);

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Auth error:", error.message);
  }

  // 1. If no user is found, redirect to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. If user exists, check their role
  if (user) {
    const rawUserRole = user.user_metadata?.role;
    const userRole = rawUserRole ? normalizeUserRole(rawUserRole) : null;
    const authPending = request.cookies.get('auth-pending')?.value;

    // Debug logging
    console.log("Path:", pathname, "User:", !!user, "Raw Role:", rawUserRole, "Normalized Role:", userRole, "Auth Pending:", authPending);
    console.log("Path:", pathname, "User:", !!user, "Role:", userRole);

    // If they are logged in but have no role in metadata,
    // they MUST be allowed to reach the page that SETS the role.
    if (!userRole) {
      // If auth is pending (just logged in), allow access temporarily
      if (authPending === 'true') {
        return NextResponse.next();
      }

      // If they are already going to setup, let them.
      // Otherwise, you might want to redirect them TO the setup/sync page.
      if (pathname === '/dashboard/setup') return NextResponse.next();

      // Allow access to dashboard while role sync happens
      if (pathname === '/dashboard') return NextResponse.next();

      // For other pages, allow access temporarily (cookies may be setting)
      // This prevents the redirect loop during login
      return NextResponse.next();
    }

    // 3. Prevent logged-in users from seeing the login page
    if (pathname === '/login') {
      const targetPath = ROLE_PATHS[userRole as keyof typeof ROLE_PATHS] || '/dashboard';
      return NextResponse.redirect(new URL(targetPath, request.url));
    }

    // 4. Check role-based access for protected routes
    const protectedRoute = ROLE_PROTECTIONS.find(({ prefix }) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (protectedRoute && userRole && !protectedRoute.roles.includes(userRole as UserRole)) {
      const homePath = ROLE_PATHS[userRole as keyof typeof ROLE_PATHS] || '/dashboard';
      return NextResponse.redirect(new URL(homePath, request.url));
    }

    // 5. Redirect root/dashboard paths to role-specific homes
    // Temporarily disabled to prevent auth loops until role consistency is fixed
    /*
    if (pathname === "/" || pathname === "/dashboard") {
      const targetPath = ROLE_PATHS[userRole as keyof typeof ROLE_PATHS] || '/dashboard';

      // ONLY redirect if the user isn't already on their target path
      if (pathname !== targetPath) {
        return NextResponse.redirect(new URL(targetPath, request.url));
      }
    }
    */
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
