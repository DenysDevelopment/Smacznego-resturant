'use server'
import { cookies, headers } from 'next/headers'
import { sessionCookieName, SESSION_TTL_MS, signSession, checkPasscode, type Role } from './passcode'
import { loginIpLimiter, loginGlobalLimiter, clientIpFrom, GLOBAL_KEY } from './rateLimit'

export async function login(
  role: Role,
  code: string,
): Promise<{ ok: true } | { ok: false; error: 'bad_code' | 'not_configured' | 'rate_limited' }> {
  const secret = process.env.AUTH_SECRET
  if (!secret) return { ok: false, error: 'not_configured' }
  const ip = clientIpFrom(await headers())
  if (loginIpLimiter.isLimited(ip) || loginGlobalLimiter.isLimited(GLOBAL_KEY)) {
    return { ok: false, error: 'rate_limited' }
  }
  if (!checkPasscode(role, code)) {
    // only failures count toward the limit; the global backstop covers XFF spoofing
    loginIpLimiter.hit(ip)
    loginGlobalLimiter.hit(GLOBAL_KEY)
    return { ok: false, error: 'bad_code' }
  }
  const token = signSession(role, Date.now() + SESSION_TTL_MS, secret)
  ;(await cookies()).set(sessionCookieName(role), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
  return { ok: true }
}

export async function logout(role: Role): Promise<void> {
  ;(await cookies()).delete(sessionCookieName(role))
}
