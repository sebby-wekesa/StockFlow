import { NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/auth-session'

export async function POST() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const loginUrl = `${baseUrl}/login`
  const response = NextResponse.redirect(loginUrl, { status: 302 })
  clearAuthCookies(response.cookies)

  return response
}
