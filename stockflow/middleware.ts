import { proxy } from './proxy'

export async function middleware(request) {
  return proxy(request)
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}