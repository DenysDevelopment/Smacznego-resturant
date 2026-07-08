import 'server-only'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifySession, type Role } from './passcode'

export async function getSession(): Promise<{ role: Role } | null> {
  const secret = process.env.AUTH_SECRET
  if (!secret) return null
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  const s = verifySession(token, secret, Date.now())
  return s ? { role: s.role } : null
}
