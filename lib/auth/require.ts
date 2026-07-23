import 'server-only'
import { redirect } from 'next/navigation'
import { getSession } from './session'
import type { Role } from './passcode'

/**
 * Page-level guard: redirect to the role's login when the session is missing
 * or has the wrong role. Defense in depth — proxy.ts gates the same routes,
 * but pages and loaders must not rely on the middleware alone.
 */
export async function requireRole(role: Role): Promise<void> {
  const session = await getSession(role)
  if (session?.role !== role) redirect(role === 'staff' ? '/admin/login' : '/courier/login')
}

/** Action/loader-level guard: no redirect, just the verdict. */
export async function hasRole(role: Role): Promise<boolean> {
  const session = await getSession(role)
  return session?.role === role
}
