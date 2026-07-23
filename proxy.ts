import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { LOCALES, DEFAULT_LOCALE } from './i18n/config'
import { sessionCookieName, verifySession, type Role } from './lib/auth/passcode'

const intl = createMiddleware({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
})

function gate(request: NextRequest, requiredRole: Role, loginPath: string): NextResponse {
  if (request.nextUrl.pathname === loginPath) return NextResponse.next()
  const token = request.cookies.get(sessionCookieName(requiredRole))?.value
  const secret = process.env.AUTH_SECRET
  const session = token && secret ? verifySession(token, secret, Date.now()) : null
  if (!session || session.role !== requiredRole) {
    return NextResponse.redirect(new URL(loginPath, request.url))
  }
  return NextResponse.next()
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // A Server Action POST must never be redirected to an HTML login page — the
  // action client can't parse that and throws "An unexpected response was
  // received from the server". Let it run: every admin/courier action re-checks
  // getSession() itself and returns a clean { ok:false, error:'unauthorized' },
  // and the follow-up navigation lands on the login page normally.
  const isServerAction = request.method === 'POST' && request.headers.has('next-action')

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return isServerAction ? NextResponse.next() : gate(request, 'staff', '/admin/login')
  }
  if (pathname === '/courier' || pathname.startsWith('/courier/')) {
    return isServerAction ? NextResponse.next() : gate(request, 'courier', '/courier/login')
  }
  return intl(request)
}

export const config = {
  // Keep excluding api/_next/_vercel/static files; admin & courier ARE matched so the gate runs.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
