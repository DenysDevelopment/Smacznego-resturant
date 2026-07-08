'use server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, SESSION_TTL_MS, signSession, checkPasscode, type Role } from './passcode'

export async function login(
  role: Role,
  code: string,
): Promise<{ ok: true } | { ok: false; error: 'bad_code' | 'not_configured' }> {
  const secret = process.env.AUTH_SECRET
  if (!secret) return { ok: false, error: 'not_configured' }
  if (!checkPasscode(role, code)) return { ok: false, error: 'bad_code' }
  const token = signSession(role, Date.now() + SESSION_TTL_MS, secret)
  ;(await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
  return { ok: true }
}

export async function logout(): Promise<void> {
  ;(await cookies()).delete(SESSION_COOKIE)
}
