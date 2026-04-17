import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userRole: string | null = null;
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    });
    userRole = dbUser?.role || null;
  }

  // Role-based access control
  if (request.nextUrl.pathname.startsWith('/dashboard/sales') && userRole !== 'SALES') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (request.nextUrl.pathname.startsWith('/admin') && userRole !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If the user is logged in and tries to hit the landing page, send them to the NEW dashboard
  if (user && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If user is NOT logged in and trying to access dashboard, send to login
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is logged in and trying to access login, send to dashboard
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object instead of the supabaseResponse object

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}