// @ts-ignore
if (typeof __dirname === 'undefined') globalThis.__dirname = '/';
// @ts-ignore
if (typeof __filename === 'undefined') globalThis.__filename = '/middleware.js';

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}