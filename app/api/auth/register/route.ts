import { NextRequest, NextResponse } from 'next/server'
import {
  createSessionToken,
  COOKIE_NAME,
  DEFAULT_USERS,
  getRegisteredUsers,
  addRegisteredUser,
  hashPassword,
} from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu' },
        { status: 400 },
      )
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return NextResponse.json({ error: 'Địa chỉ Email không đúng định dạng' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự' }, { status: 400 })
    }

    // Check if email already exists in DEFAULT_USERS or registered users
    const existsInDefault = DEFAULT_USERS.some((u) => u.email.toLowerCase() === cleanEmail)
    const existsInRegistered = getRegisteredUsers().some((u) => u.email.toLowerCase() === cleanEmail)

    if (existsInDefault || existsInRegistered) {
      return NextResponse.json(
        { error: 'Email này đã được đăng ký tài khoản trong hệ thống' },
        { status: 400 },
      )
    }

    const salt = 'salt_' + Math.random().toString(36).substring(2, 10)
    const passwordHash = await hashPassword(password, salt)
    const newUserId = 'usr_mem_' + Math.random().toString(36).substring(2, 9)

    const newUserRecord = {
      id: newUserId,
      email: cleanEmail,
      name: cleanName,
      role: 'member' as const,
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      passwordHash,
      salt,
    }

    // Persist to server in-memory storage
    addRegisteredUser(newUserRecord)

    const publicUser = {
      id: newUserRecord.id,
      email: newUserRecord.email,
      name: newUserRecord.name,
      role: newUserRecord.role,
      avatarUrl: newUserRecord.avatarUrl,
    }

    // Create session token and set cookie
    const token = await createSessionToken(publicUser)

    const response = NextResponse.json({
      success: true,
      message: 'Đăng ký tài khoản thành viên thành công!',
      user: publicUser,
    })

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch {
    console.error('Registration error occurred')
    return NextResponse.json({ error: 'Đã xảy ra lỗi trong quá trình đăng ký' }, { status: 500 })
  }
}
