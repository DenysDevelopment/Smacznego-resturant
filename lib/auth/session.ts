import 'server-only'
import { cookies } from 'next/headers'
import { sessionCookieName, verifySession, type Role } from './passcode'

/** Read the session for a specific role (each role has its own cookie). */
export async function getSession(role: Role): Promise<{ role: Role } | null> {
  const secret = process.env.AUTH_SECRET
  if (!secret) return null
  const token = (await cookies()).get(sessionCookieName(role))?.value
  if (!token) return null
  const s = verifySession(token, secret, Date.now())
  // the token must actually carry the role of the cookie slot it came from
  return s && s.role === role ? { role: s.role } : null
}

/** Any valid session (staff or courier) — for endpoints open to both roles. */
export async function getAnySession(): Promise<{ role: Role } | null> {
  return (await getSession('staff')) ?? (await getSession('courier'))
}
