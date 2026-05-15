import { NextRequest, NextResponse } from 'next/server'
import { signIn } from '@/actions/auth'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const result = await signIn(formData)

    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Signin API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}