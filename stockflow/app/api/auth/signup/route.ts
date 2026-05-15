import { NextRequest, NextResponse } from 'next/server'
import { signUp } from '@/actions/auth'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const result = await signUp(formData)

    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    if (result?.message) {
      return NextResponse.json({ message: result.message })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Signup API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}