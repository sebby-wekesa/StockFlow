import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-admin";
import type { UserRole } from "@/lib/types";

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

const ROLE_PATHS = {
  ADMIN: "/admin/dashboard",
  MANAGER: "/dashboard",
  WAREHOUSE: "/dashboard",
  SALES: "/dashboard",
  ACCOUNTANT: "/reports",
  OPERATOR: "/dashboard",
  PACKAGING: "/dashboard",
  PENDING: "/dashboard/setup",
};

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
  const supabase = supabaseServer();

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Get session from Supabase
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  // 1. If no user is found and path is protected, go to login
  if (!user && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. If user exists, check their role
  if (user) {
    const userRole = request.cookies.get('user-role')?.value;

    // IF NO ROLE COOKIE YET: Don't bounce to login!
    // Instead, allow them through to a "loading" or "setup" route
    if (!userRole && pathname !== '/dashboard/setup') {
      // Allow the request to continue so the server-side Page
      // can fetch the role from the DB and set the cookie.
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
    if (pathname === "/" || pathname === "/dashboard") {
      const targetPath = ROLE_PATHS[userRole as keyof typeof ROLE_PATHS] || '/dashboard';
      return NextResponse.redirect(new URL(targetPath, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
