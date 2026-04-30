import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ROLE_PATHS } from '@/lib/types'

export type TeamRole = 'admin' | 'manager' | 'operator' | 'packaging' | 'warehouse' | 'sales';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static files, and auth routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/auth/') ||
    pathname.includes('.') ||
    pathname === '/login' ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  const demoLoggedIn = request.cookies.get('demo-logged-in')?.value

  if (demoLoggedIn === 'true') {
    // Demo mode: skip Supabase auth, allow access
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  // Set pathname header for role checks
  supabaseResponse.headers.set('x-pathname', request.nextUrl.pathname)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase Proxy: Missing environment variables. Skipping auth check.");
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const userRole = request.cookies.get('user-role')?.value;

    // Define role-specific protected paths
    const roleProtections: Record<string, string[]> = {
      '/admin': ['ADMIN'],
      '/manager': ['MANAGER', 'ADMIN'],
      '/operator': ['OPERATOR', 'ADMIN'],
      '/packaging': ['PACKAGING', 'ADMIN'],
      '/warehouse': ['WAREHOUSE', 'ADMIN'],
    };

    // Check if current path requires specific role
    for (const [path, allowedRoles] of Object.entries(roleProtections)) {
      if (pathname.startsWith(path)) {
        if (!allowedRoles.includes(userRole)) {
          // Redirect to appropriate dashboard based on user role
          const redirectPath = ROLE_PATHS[userRole as keyof typeof ROLE_PATHS] || '/dashboard';
          return NextResponse.redirect(new URL(redirectPath, request.url));
        }
        break;
      }
    }

    // Redirect /dashboard to role-specific page
    if (request.nextUrl.pathname === '/dashboard' && userRole && userRole !== 'PENDING') {
      const rolePath = ROLE_PATHS[userRole as keyof typeof ROLE_PATHS];
      if (rolePath && rolePath !== '/dashboard') {
        return NextResponse.redirect(new URL(rolePath, request.url));
      }
    }

    if (request.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  } else {
    // User not authenticated, redirect to login for protected paths
    const protectedPaths = ['/admin', '/manager', '/operator', '/packaging', '/warehouse', '/dashboard'];
    if (protectedPaths.some(path => pathname.startsWith(path))) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }



  return supabaseResponse
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}