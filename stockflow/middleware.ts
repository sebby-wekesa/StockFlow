import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from '@supabase/ssr'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getRoleHomePage, normalizeUserRole } from '@/lib/types'

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  const publicRoutes = ['/login', '/auth/callback', '/auth/auth-code-error']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Skip middleware for API, static, auth routes
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.includes('.') || isPublicRoute) {
    return NextResponse.next()
  }

  // Create Supabase client
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Get session
  const { data: { session } } = await supabase.auth.getSession()

  // If no session, redirect to login
  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If session exists and on login page, redirect based on role
  if (session && pathname === '/login') {
    try {
      const role = await resolveUserRole(session.user.id, session.user.user_metadata?.role)
      const homePage = getRoleHomePage(role)
      return NextResponse.redirect(new URL(homePage, request.url))
    } catch (error) {
      console.error('Role resolution failed:', error)
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // For protected routes, check role access
  if (session && pathname.startsWith('/admin')) {
    try {
      const role = await resolveUserRole(session.user.id, session.user.user_metadata?.role)
      if (role !== 'ADMIN') {
        const homePage = getRoleHomePage(role)
        return NextResponse.redirect(new URL(homePage, request.url))
      }
    } catch (error) {
      console.error('Role check failed:', error)
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

// Helper function to resolve user role
async function resolveUserRole(userId: string, fallbackRole?: string) {
  const supabaseAdmin = getSupabaseAdmin()

  if (!supabaseAdmin) {
    return normalizeUserRole(fallbackRole)
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle()

    if (error) {
      console.error("Profile lookup failed:", error)
    }

    return normalizeUserRole(data?.role ?? fallbackRole)
  } catch (error) {
    console.error("Profile lookup error:", error)
    return normalizeUserRole(fallbackRole)
  }
}
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

</content>
<parameter name="filePath">C:\Users\sebby\Desktop\StockFlow\stockflow\middleware.ts