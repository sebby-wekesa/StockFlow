import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.redirect('/login', { status: 302 })

  // Clear auth token
  response.cookies.set('auth-token', '', {
    expires: new Date(0),
    path: '/',
  })

  // Clear demo mode if set
  response.cookies.set('demo-logged-in', '', {
    expires: new Date(0),
    path: '/',
  })

  return response
}