import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken, COOKIE_NAME, DEFAULT_USERS, getRegisteredUsers, hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ Email và Mật khẩu' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()

    // 1. Check default predefined users
    const defaultUserFound = DEFAULT_USERS.find((u) => u.email.toLowerCase() === cleanEmail)
    if (defaultUserFound) {
      const computedHash = await hashPassword(password, defaultUserFound.salt)
      const isValid = computedHash === defaultUserFound.passwordHash

      if (!isValid) {
        return NextResponse.json({ error: 'Mật khẩu không chính xác' }, { status: 401 })
      }

      const publicUser = {
        id: defaultUserFound.id,
        email: defaultUserFound.email,
        name: defaultUserFound.name,
        role: defaultUserFound.role,
        avatarUrl: defaultUserFound.avatarUrl,
      }

      const token = await createSessionToken(publicUser)
      const response = NextResponse.json({ success: true, user: publicUser })

      response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      })

      return response
    }

    // 2. Check dynamically registered members
    const registeredUserFound = getRegisteredUsers().find((u) => u.email.toLowerCase() === cleanEmail)
    if (registeredUserFound) {
      const computedHash = await hashPassword(password, registeredUserFound.salt)
      if (computedHash !== registeredUserFound.passwordHash) {
        return NextResponse.json({ error: 'Mật khẩu không chính xác' }, { status: 401 })
      }

      const publicUser = {
        id: registeredUserFound.id,
        email: registeredUserFound.email,
        name: registeredUserFound.name,
        role: registeredUserFound.role,
        avatarUrl: registeredUserFound.avatarUrl,
      }

      const token = await createSessionToken(publicUser)
      const response = NextResponse.json({ success: true, user: publicUser })

      response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      })

      return response
    }

    return NextResponse.json({ error: 'Email hoặc mật khẩu không hợp lệ' }, { status: 401 })
  } catch {
    console.error('Login error occurred')
    return NextResponse.json({ error: 'Đã xảy ra lỗi khi đăng nhập' }, { status: 500 })
  }
}
