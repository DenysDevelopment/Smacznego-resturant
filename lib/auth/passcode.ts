import { createHmac, timingSafeEqual } from 'node:crypto'

export type Role = 'staff' | 'courier'
export const SESSION_COOKIE = 'sc_session'
export const SESSION_TTL_MS = 30 * 24 * 3600_000

function hmac(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/** token = `${role}|${expiresAt}|${HMAC(role|expiresAt)}` */
export function signSession(role: Role, expiresAt: number, secret: string): string {
  const payload = `${role}|${expiresAt}`
  return `${payload}|${hmac(payload, secret)}`
}

export function verifySession(
  token: string,
  secret: string,
  now: number,
): { role: Role; expiresAt: number } | null {
  const parts = token.split('|')
  if (parts.length !== 3) return null
  const [role, expiresRaw, sig] = parts
  if (role !== 'staff' && role !== 'courier') return null
  const payload = `${role}|${expiresRaw}`
  if (!safeEqual(sig, hmac(payload, secret))) return null
  const expiresAt = Number(expiresRaw)
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return null
  return { role, expiresAt }
}

/** Compare a submitted passcode against the env-configured code for the role. */
export function checkPasscode(
  role: Role,
  code: string,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const expected = role === 'staff' ? env.ADMIN_PASSCODE : env.COURIER_PASSCODE
  if (!expected || !code) return false
  return safeEqual(code, expected)
}
