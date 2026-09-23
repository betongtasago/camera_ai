import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }
    return NextResponse.json({ user }, { status: 200 })
  } catch {
    console.error('Error fetching current user')
    return NextResponse.json({ user: null }, { status: 500 })
  }
}
