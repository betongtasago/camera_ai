import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { User } from './types'

const configuredSecret = process.env.JWT_SECRET || process.env.JWE_SECRET
if (!configuredSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET or JWE_SECRET must be configured in production')
}

const JWT_SECRET = new TextEncoder().encode(configuredSecret || 'local-development-secret-change-me-before-deploying')

const COOKIE_NAME = 'camerai_session'

// Default accounts
export const DEFAULT_USERS: Array<User & { passwordHash: string; salt: string }> = [
  {
    id: 'usr_admin_01',
    email: 'admin@camerai.vn',
    name: 'Quản trị viên Hệ thống',
    role: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    // Default password: Admin@123456
    passwordHash: 'a4fd9cd312bc9eb8de76aa09187e4625746214f9200b94844b01ecc3beb27684',
    salt: 'camerai_salt_admin',
  },
  {
    id: 'usr_operator_02',
    email: 'operator@camerai.vn',
    name: 'Giám sát viên Trạm cân',
    role: 'operator',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    // Default password: Operator@123456
    passwordHash: '028c5eb74f659477f4368f2b3d31e06b868b19ac21b89d0e7897c6f8ed0f0b32',
    salt: 'camerai_salt_operator',
  },
  {
    id: 'usr_member_03',
    email: 'member@camerai.vn',
    name: 'Thành viên Xem Camera',
    role: 'member',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    // Default password: Member@123456
    passwordHash: '9a29417571ab15f15e6470bf420509a077b9921b6b2bb590ddda7c669f7d2b78',
    salt: 'camerai_salt_member',
  },
]

export type RegisteredUserRecord = User & { passwordHash: string; salt: string }

declare global {
  var __camerai_registered_users__: RegisteredUserRecord[] | undefined
}

export function getRegisteredUsers(): RegisteredUserRecord[] {
  if (!globalThis.__camerai_registered_users__) {
    globalThis.__camerai_registered_users__ = []
  }
  return globalThis.__camerai_registered_users__
}

export function addRegisteredUser(user: RegisteredUserRecord): void {
  const users = getRegisteredUsers()
  users.push(user)
}

// SHA-256 password hash using standard Web Crypto API
export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder()
  const data = enc.encode(password + ':' + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function createSessionToken(user: User): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifySessionToken(token: string): Promise<User | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as 'admin' | 'operator' | 'member',
      avatarUrl: payload.avatarUrl as string | undefined,
    }
  } catch {
    return null
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null
    return await verifySessionToken(token)
  } catch {
    return null
  }
}

export { COOKIE_NAME }
