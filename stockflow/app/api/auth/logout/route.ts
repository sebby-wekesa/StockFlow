import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })

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

  // Redirect to login
  response.headers.set('Location', '/login')
  response.status = 302

  return response
}