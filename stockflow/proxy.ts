import { NextResponse, type NextRequest } from "next/server";
import { clearAuthCookies, getRoleHomePage, getSessionContext, setUserRoleCookie } from "@/lib/auth-session";
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

function isPublicPath(pathname: string) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/auth/") ||
    pathname.includes(".") ||
    PUBLIC_PATHS.has(pathname)
  );
}

function redirectTo(url: URL, role?: UserRole) {
  const response = NextResponse.redirect(url);

  if (role) {
    setUserRoleCookie(response.cookies, role);
  }

  return response;
}

function matchProtectedRoute(pathname: string) {
  return ROLE_PROTECTIONS.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("auth-token")?.value;

  if (!accessToken) {
    return redirectTo(new URL("/login", request.url));
  }

  const session = await getSessionContext(accessToken);

  if (!session) {
    const response = redirectTo(new URL("/login", request.url));
    clearAuthCookies(response.cookies);
    return response;
  }

  const roleHome = getRoleHomePage(session.role);

  if (pathname === "/" || pathname === "/dashboard") {
    return redirectTo(new URL(roleHome, request.url), session.role);
  }

  const protectedRoute = matchProtectedRoute(pathname);
  if (protectedRoute && !protectedRoute.roles.includes(session.role)) {
    return redirectTo(new URL(roleHome, request.url), session.role);
  }

  const response = NextResponse.next();
  setUserRoleCookie(response.cookies, session.role);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
