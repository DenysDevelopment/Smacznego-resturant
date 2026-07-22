# Admin/Courier Panel (Ф3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two internal, passcode-gated, Russian-language screens — `/admin` (kitchen/operator order board) and `/courier` (delivery queue) — with instant Realtime updates, closing the order lifecycle after checkout.

**Architecture:** Passcode → signed httpOnly cookie (HMAC, Node `crypto`). A Node-runtime `proxy.ts` (Next 16's renamed `middleware`) gates `/admin*` and `/courier*` and delegates everything else to next-intl. Every status mutation is a server action that re-verifies the session (proxy alone is not trusted). Orders are read/written via the existing service-role `createAdminClient` (tables are RLS-private). Realtime is a service-role Supabase `postgres_changes` subscription proxied to the browser over a cookie-gated SSE Route Handler; the client calls `router.refresh()` on events and plays a sound.

**Tech Stack:** Next.js 16.2.10 (App Router, Turbopack), React 19, TypeScript, Tailwind v4, `@supabase/supabase-js` v2 (service-role + Realtime), Vitest + Testing Library, Node `crypto`.

## Global Constraints

- **This is NOT the Next.js you know** — use `node_modules/next/dist/docs/` for version-sensitive APIs. Confirmed for this version:
  - `middleware.ts` is deprecated → use **`proxy.ts`** at repo root, exporting `default function proxy(request: NextRequest)`. Proxy runs on the **Node.js runtime** (so `node:crypto` is available).
  - `cookies()` from `next/headers` is **async**: `const c = await cookies()`. `.set`/`.delete` only inside server actions / route handlers.
  - Route Handlers: `export async function GET(request: Request)`; return a `Response` wrapping a Web `ReadableStream` for SSE.
  - Server Actions are POST requests to the same route; a proxy matcher that excludes a path also skips its server actions — therefore **re-verify auth inside every server action**.
- **No emoji in UI** — SVG icons only (`components/Icon.tsx`). Real photos where dishes appear.
- **Money is integer grosze**; format with `formatZloty(grosze, 'pl')` from `lib/menu/price.ts` (returns e.g. `"62,00 zł"`).
- **UI language: Russian**, single language (no next-intl for these screens).
- **Order status enum** is fixed by DB CHECK (`0002_orders.sql`): `pending, confirmed, preparing, ready, out_for_delivery, delivered, picked_up, cancelled, rejected`.
- **Tests:** `npm test` = `NODE_OPTIONS=--no-experimental-webstorage vitest run`. Test files live in `__tests__/` next to source (see `components/cart/__tests__`, `lib/orders/__tests__`).
- **Run the app** on `http://localhost:3100` (use `localhost`, NOT `127.0.0.1`, or hydration breaks). Supabase is up in Docker; REST at `127.0.0.1:54321`, Studio at `54323`.
- Commit after each task. Money/type conventions and imports use the `@/` alias (`tsconfig` paths).

---

### Task 1: Session token signing/verification (HMAC)

Pure crypto core shared by `proxy.ts` (gate) and server actions. No `next/headers`, no `server-only` — must be importable from proxy.

**Files:**
- Create: `lib/auth/passcode.ts`
- Test: `lib/auth/__tests__/passcode.test.ts`

**Module rules (Next-specific — verified against this repo):**
- This file is **pure**: no `'use server'`, no `import 'server-only'`. It is imported by `proxy.ts` (Node runtime), by server actions, AND by Vitest. `server-only`'s package resolves to a throwing `index.js` outside React Server Components, so any test importing a `server-only` module fails — keep all unit-tested logic in pure files like this one.

**Interfaces:**
- Produces:
  - `type Role = 'staff' | 'courier'`
  - `const SESSION_COOKIE = 'sc_session'`
  - `const SESSION_TTL_MS = 30 * 24 * 3600_000`
  - `signSession(role: Role, expiresAt: number, secret: string): string`
  - `verifySession(token: string, secret: string, now: number): { role: Role; expiresAt: number } | null`
  - `checkPasscode(role: Role, code: string, env?: Record<string,string|undefined>): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// lib/auth/__tests__/passcode.test.ts
import { describe, it, expect } from 'vitest'
import { signSession, verifySession, checkPasscode } from '../passcode'

const SECRET = 'test-secret-123'
const T0 = 1_000_000_000_000 // fixed "now"
const HOUR = 3_600_000

describe('session token', () => {
  it('round-trips a valid, unexpired token', () => {
    const token = signSession('staff', T0 + HOUR, SECRET)
    expect(verifySession(token, SECRET, T0)).toEqual({ role: 'staff', expiresAt: T0 + HOUR })
  })

  it('rejects an expired token', () => {
    const token = signSession('courier', T0 - 1, SECRET)
    expect(verifySession(token, SECRET, T0)).toBeNull()
  })

  it('rejects a tampered role', () => {
    const token = signSession('courier', T0 + HOUR, SECRET)
    const tampered = token.replace('courier', 'staff')
    expect(verifySession(tampered, SECRET, T0)).toBeNull()
  })

  it('rejects a wrong secret', () => {
    const token = signSession('staff', T0 + HOUR, SECRET)
    expect(verifySession(token, 'other-secret', T0)).toBeNull()
  })

  it('rejects malformed input', () => {
    expect(verifySession('', SECRET, T0)).toBeNull()
    expect(verifySession('a|b', SECRET, T0)).toBeNull()
  })
})

describe('checkPasscode', () => {
  const ENV = { ADMIN_PASSCODE: 'kitchen42', COURIER_PASSCODE: 'ride99' }
  it('accepts the correct code per role', () => {
    expect(checkPasscode('staff', 'kitchen42', ENV)).toBe(true)
    expect(checkPasscode('courier', 'ride99', ENV)).toBe(true)
  })
  it('rejects a wrong code', () => {
    expect(checkPasscode('staff', 'ride99', ENV)).toBe(false)
    expect(checkPasscode('courier', 'nope', ENV)).toBe(false)
  })
  it('rejects empty code or unset env', () => {
    expect(checkPasscode('staff', '', ENV)).toBe(false)
    expect(checkPasscode('staff', 'kitchen42', {})).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/auth/__tests__/passcode.test.ts`
Expected: FAIL — cannot resolve `../passcode`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/auth/passcode.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/auth/__tests__/passcode.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/auth/passcode.ts lib/auth/__tests__/passcode.test.ts
git commit -m "feat(auth): HMAC-signed session token core"
```

---

### Task 2: Session reader (server-only) + login/logout server actions + env

Cookie I/O splits into two files to satisfy Next's rules: `getSession` is a
plain async server util (server-only); `login`/`logout` are server actions
(`'use server'` files may export **only** async functions). No unit test — the
pure passcode logic is tested in Task 1; cookie I/O is verified by running the app.

**Files:**
- Create: `lib/auth/session.ts` (server-only reader)
- Create: `lib/auth/actions.ts` (`'use server'` login/logout)
- Modify: `.env.local`, `.env.example`

**Interfaces:**
- Consumes: `Role`, `SESSION_COOKIE`, `SESSION_TTL_MS`, `signSession`, `verifySession`, `checkPasscode` (Task 1).
- Produces:
  - `getSession(): Promise<{ role: Role } | null>` (in `session.ts`)
  - `login(role: Role, code: string): Promise<{ ok: true } | { ok: false; error: 'bad_code' | 'not_configured' }>` (in `actions.ts`)
  - `logout(): Promise<void>` (in `actions.ts`)

- [ ] **Step 1: Session reader (server-only util)**

```ts
// lib/auth/session.ts
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
```

- [ ] **Step 2: Login/logout server actions**

```ts
// lib/auth/actions.ts
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
```

- [ ] **Step 3: Add env vars**

Append to `.env.local` (real values) and `.env.example` (placeholders):

```bash
# .env.local
ADMIN_PASSCODE=kitchen42
COURIER_PASSCODE=ride99
AUTH_SECRET=dev-only-change-me-to-a-long-random-string
```

```bash
# .env.example
ADMIN_PASSCODE=
COURIER_PASSCODE=
AUTH_SECRET=
```

- [ ] **Step 4: Verify the module boundary**

Run: `npm test`
Expected: existing + Task 1 tests still pass (no test imports these server-only/'use server' files, so nothing throws).

- [ ] **Step 5: Commit**

```bash
git add lib/auth/session.ts lib/auth/actions.ts .env.example
git commit -m "feat(auth): session reader + login/logout server actions"
```

---

### Task 3: `proxy.ts` gate (migrate from `middleware.ts`)

**Files:**
- Create: `proxy.ts`
- Delete: `middleware.ts`

**Interfaces:**
- Consumes: `SESSION_COOKIE`, `verifySession` (Task 1); `createMiddleware`, `LOCALES`, `DEFAULT_LOCALE` (existing).

- [ ] **Step 1: Create `proxy.ts`**

```ts
// proxy.ts
import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { LOCALES, DEFAULT_LOCALE } from './i18n/config'
import { SESSION_COOKIE, verifySession, type Role } from './lib/auth/passcode'

const intl = createMiddleware({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
})

function gate(request: NextRequest, requiredRole: Role, loginPath: string): NextResponse {
  if (request.nextUrl.pathname === loginPath) return NextResponse.next()
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const secret = process.env.AUTH_SECRET
  const session = token && secret ? verifySession(token, secret, Date.now()) : null
  if (!session || session.role !== requiredRole) {
    return NextResponse.redirect(new URL(loginPath, request.url))
  }
  return NextResponse.next()
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return gate(request, 'staff', '/admin/login')
  }
  if (pathname === '/courier' || pathname.startsWith('/courier/')) {
    return gate(request, 'courier', '/courier/login')
  }
  return intl(request)
}

export const config = {
  // Keep excluding api/_next/_vercel/static files; admin & courier ARE matched so the gate runs.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
```

- [ ] **Step 2: Delete the old middleware**

```bash
git rm middleware.ts
```

- [ ] **Step 3: Verify the gate by running the app**

Restart dev if needed: `PORT=3100 npm run dev`. Then:

Run: `curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://localhost:3100/admin`
Expected: `307 -> http://localhost:3100/admin/login` (redirected, gate active).

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/pl`
Expected: `200` (locale routing still works).

- [ ] **Step 4: Commit**

```bash
git add proxy.ts
git commit -m "feat(auth): proxy.ts gate for /admin and /courier (replaces middleware)"
```

---

### Task 4: Order status flow (transitions + actions)

**Files:**
- Create: `lib/orders/statusFlow.ts`
- Test: `lib/orders/__tests__/statusFlow.test.ts`

**Interfaces:**
- Produces:
  - `type OrderStatus` (the 9 enum values), `type OrderType = 'delivery' | 'pickup'`
  - `canTransition(type: OrderType, from: OrderStatus, to: OrderStatus): boolean`
  - `type StatusAction = { to: OrderStatus; label: string; tone: 'primary' | 'danger' | 'neutral' }`
  - `operatorActions(type: OrderType, status: OrderStatus): StatusAction[]`
  - `courierActions(status: OrderStatus): StatusAction[]`
  - `isCourierVisible(o: { type: OrderType; status: OrderStatus }): boolean`
  - `STATUS_LABEL_RU: Record<OrderStatus, string>`

(Kept here, in a pure module, so it is unit-testable — the query module in Task 5 is `server-only` and cannot be imported by Vitest.)

- [ ] **Step 1: Write the failing test**

```ts
// lib/orders/__tests__/statusFlow.test.ts
import { describe, it, expect } from 'vitest'
import { canTransition, operatorActions, courierActions, isCourierVisible } from '../statusFlow'

describe('canTransition', () => {
  it('allows pending -> confirmed / rejected', () => {
    expect(canTransition('delivery', 'pending', 'confirmed')).toBe(true)
    expect(canTransition('delivery', 'pending', 'rejected')).toBe(true)
  })
  it('delivery ready -> out_for_delivery, pickup ready -> picked_up', () => {
    expect(canTransition('delivery', 'ready', 'out_for_delivery')).toBe(true)
    expect(canTransition('delivery', 'ready', 'picked_up')).toBe(false)
    expect(canTransition('pickup', 'ready', 'picked_up')).toBe(true)
    expect(canTransition('pickup', 'ready', 'out_for_delivery')).toBe(false)
  })
  it('blocks skips and transitions out of terminal states', () => {
    expect(canTransition('delivery', 'pending', 'delivered')).toBe(false)
    expect(canTransition('delivery', 'delivered', 'ready')).toBe(false)
  })
})

describe('operatorActions', () => {
  it('offers accept/reject on pending', () => {
    expect(operatorActions('delivery', 'pending').map((a) => a.to)).toEqual(['confirmed', 'rejected'])
  })
  it('delivery ready has no operator advance (courier takes over), still cancellable', () => {
    expect(operatorActions('delivery', 'ready').map((a) => a.to)).toEqual(['cancelled'])
  })
  it('pickup ready can be marked picked_up', () => {
    expect(operatorActions('pickup', 'ready').map((a) => a.to)).toContain('picked_up')
  })
})

describe('courierActions', () => {
  it('ready -> забрал, out_for_delivery -> доставлен', () => {
    expect(courierActions('ready').map((a) => a.to)).toEqual(['out_for_delivery'])
    expect(courierActions('out_for_delivery').map((a) => a.to)).toEqual(['delivered'])
    expect(courierActions('delivered')).toEqual([])
  })
})

describe('isCourierVisible', () => {
  it('shows delivery orders that are ready or out for delivery', () => {
    expect(isCourierVisible({ type: 'delivery', status: 'ready' })).toBe(true)
    expect(isCourierVisible({ type: 'delivery', status: 'out_for_delivery' })).toBe(true)
  })
  it('hides pickup and non-active-delivery statuses', () => {
    expect(isCourierVisible({ type: 'pickup', status: 'ready' })).toBe(false)
    expect(isCourierVisible({ type: 'delivery', status: 'preparing' })).toBe(false)
    expect(isCourierVisible({ type: 'delivery', status: 'delivered' })).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/orders/__tests__/statusFlow.test.ts`
Expected: FAIL — cannot resolve `../statusFlow`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/orders/statusFlow.ts
export type OrderStatus =
  | 'pending' | 'confirmed' | 'preparing' | 'ready'
  | 'out_for_delivery' | 'delivered' | 'picked_up'
  | 'cancelled' | 'rejected'
export type OrderType = 'delivery' | 'pickup'

export const STATUS_LABEL_RU: Record<OrderStatus, string> = {
  pending: 'Новый',
  confirmed: 'Принят',
  preparing: 'Готовится',
  ready: 'Готов',
  out_for_delivery: 'В доставке',
  delivered: 'Доставлен',
  picked_up: 'Выдан',
  cancelled: 'Отменён',
  rejected: 'Отклонён',
}

// Allowed forward transitions, keyed by order type (some depend on delivery vs pickup).
function allowed(type: OrderType, from: OrderStatus): OrderStatus[] {
  switch (from) {
    case 'pending': return ['confirmed', 'rejected']
    case 'confirmed': return ['preparing', 'cancelled']
    case 'preparing': return ['ready', 'cancelled']
    case 'ready': return type === 'delivery'
      ? ['out_for_delivery', 'cancelled']
      : ['picked_up', 'cancelled']
    case 'out_for_delivery': return ['delivered', 'cancelled']
    default: return [] // delivered, picked_up, cancelled, rejected are terminal
  }
}

export function canTransition(type: OrderType, from: OrderStatus, to: OrderStatus): boolean {
  return allowed(type, from).includes(to)
}

export type StatusAction = { to: OrderStatus; label: string; tone: 'primary' | 'danger' | 'neutral' }

const LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: 'Принять',
  rejected: 'Отклонить',
  preparing: 'Готовим',
  ready: 'Готов',
  picked_up: 'Выдан',
  cancelled: 'Отменить',
  out_for_delivery: 'Забрал',
  delivered: 'Доставлен',
}
const TONE: Partial<Record<OrderStatus, StatusAction['tone']>> = {
  rejected: 'danger', cancelled: 'danger',
}

function action(to: OrderStatus): StatusAction {
  return { to, label: LABEL[to] ?? to, tone: TONE[to] ?? 'primary' }
}

// Operator: everything except the courier-owned ready->out_for_delivery and out_for_delivery->delivered.
export function operatorActions(type: OrderType, status: OrderStatus): StatusAction[] {
  return allowed(type, status)
    .filter((to) => to !== 'out_for_delivery' && to !== 'delivered')
    .map(action)
}

// Courier: only the delivery hand-off steps.
export function courierActions(status: OrderStatus): StatusAction[] {
  if (status === 'ready') return [action('out_for_delivery')]
  if (status === 'out_for_delivery') return [action('delivered')]
  return []
}

// A delivery order the courier should see: ready to pick up, or already en route.
export function isCourierVisible(o: { type: OrderType; status: OrderStatus }): boolean {
  return o.type === 'delivery' && (o.status === 'ready' || o.status === 'out_for_delivery')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/orders/__tests__/statusFlow.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/orders/statusFlow.ts lib/orders/__tests__/statusFlow.test.ts
git commit -m "feat(orders): status transition map + operator/courier actions"
```

---

### Task 5: Admin order queries (server-only)

**Files:**
- Create: `lib/orders/adminOrders.ts`

No unit test — this module is `server-only` (imports `createAdminClient`) and cannot be imported by Vitest. The pure filter `isCourierVisible` lives in `statusFlow.ts` (Task 4, tested). Query correctness is verified with a live DB query in Step 3.

**Interfaces:**
- Consumes: `createAdminClient` (`lib/supabase/admin.ts`); `OrderStatus`, `OrderType` (Task 4).
- Produces:
  - `interface AdminOrderItem { name: string; qty: number; unit_price: number; line_total: number; selected_options: { optionName: string }[] }`
  - `interface AdminOrder { id: string; public_token: string; status: OrderStatus; type: OrderType; customer_name: string; customer_phone: string; subtotal: number; delivery_fee: number; total: number; cash_change_from: number | null; notes: string | null; address_snapshot: { formatted?: string } | null; scheduled_for: string | null; created_at: string; order_items: AdminOrderItem[] }`
  - `listActiveOrders(): Promise<AdminOrder[]>` (all non-terminal + today's terminal, newest first)
  - `listCourierQueue(): Promise<AdminOrder[]>` (delivery orders in `ready` or `out_for_delivery`)
  - `SELECT_COLUMNS` string constant

- [ ] **Step 1: Write the module**

```ts
// lib/orders/adminOrders.ts
import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { OrderStatus, OrderType } from './statusFlow'

export interface AdminOrderItem {
  name: string; qty: number; unit_price: number; line_total: number
  selected_options: { optionName: string }[]
}
export interface AdminOrder {
  id: string; public_token: string; status: OrderStatus; type: OrderType
  customer_name: string; customer_phone: string
  subtotal: number; delivery_fee: number; total: number
  cash_change_from: number | null; notes: string | null
  address_snapshot: { formatted?: string } | null
  scheduled_for: string | null; created_at: string
  order_items: AdminOrderItem[]
}

export const SELECT_COLUMNS =
  'id, public_token, status, type, customer_name, customer_phone, subtotal, delivery_fee, total, cash_change_from, notes, address_snapshot, scheduled_for, created_at, order_items(name, qty, unit_price, line_total, selected_options)'

const TERMINAL: OrderStatus[] = ['delivered', 'picked_up', 'cancelled', 'rejected']

/**
 * Active orders (any age) + today's terminal orders, newest first.
 * Two queries merged in JS — avoids the fragile PostgREST `.or()` with a
 * comma-containing `in.(...)` list (commas collide with the or-parser).
 */
export async function listActiveOrders(): Promise<AdminOrder[]> {
  const admin = createAdminClient()
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)

  const [active, todayDone] = await Promise.all([
    admin.from('orders').select(SELECT_COLUMNS)
      .not('status', 'in', `(${TERMINAL.join(',')})`)
      .order('created_at', { ascending: false }),
    admin.from('orders').select(SELECT_COLUMNS)
      .in('status', TERMINAL)
      .gte('created_at', startOfDay.toISOString())
      .order('created_at', { ascending: false }),
  ])
  if (active.error) throw new Error(`listActiveOrders(active): ${active.error.message}`)
  if (todayDone.error) throw new Error(`listActiveOrders(done): ${todayDone.error.message}`)

  const byId = new Map<string, AdminOrder>()
  for (const row of [...(active.data ?? []), ...(todayDone.data ?? [])] as unknown as AdminOrder[]) {
    byId.set(row.id, row)
  }
  return [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function listCourierQueue(): Promise<AdminOrder[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('orders')
    .select(SELECT_COLUMNS)
    .eq('type', 'delivery')
    .in('status', ['ready', 'out_for_delivery'])
    .order('created_at', { ascending: true })
  if (error) throw new Error(`listCourierQueue: ${error.message}`)
  return (data ?? []) as unknown as AdminOrder[]
}
```

- [ ] **Step 2: Verify the queries against the live DB**

Confirm the courier-queue SQL shape returns the expected rows (place/seed at least one delivery order in `ready`):

Run: `docker exec supabase_db_SmacznegoDelivery psql -U postgres -d postgres -c "select public_token, status, type from orders where type='delivery' and status in ('ready','out_for_delivery') order by created_at;"`
Expected: lists only ready / out_for_delivery delivery orders (matches `listCourierQueue`).

Also confirm the full unit suite still passes (nothing imports this server-only file):

Run: `npm test`
Expected: PASS (Task 1 + Task 4 + existing).

- [ ] **Step 3: Commit**

```bash
git add lib/orders/adminOrders.ts
git commit -m "feat(orders): admin order queries (active board + courier queue)"
```

---

### Task 6: Transition guard (pure) + `updateOrderStatus` server action

Split for the same Next rule: `guardTransition` is pure and unit-tested (`guard.ts`);
`updateOrderStatus` is a server action (`updateStatus.ts`, `'use server'`, async only,
imported by the client `StatusButton`).

**Files:**
- Create: `lib/orders/guard.ts` (pure guard)
- Create: `lib/orders/updateStatus.ts` (`'use server'` action)
- Test: `lib/orders/__tests__/guard.test.ts`

**Interfaces:**
- Consumes: `getSession` (Task 2); `canTransition`, `courierActions`, `OrderStatus`, `OrderType` (Task 4); `Role` (Task 1); `createAdminClient`.
- Produces:
  - `guardTransition(session, order, to): { ok: true } | { ok: false; error: string }` (pure; in `guard.ts`)
  - `updateOrderStatus(orderId: string, to: OrderStatus): Promise<{ ok: true } | { ok: false; error: string }>` (server action; in `updateStatus.ts`)

- [ ] **Step 1: Write the failing test** (pure guard; DB path verified by running the app)

```ts
// lib/orders/__tests__/guard.test.ts
import { describe, it, expect } from 'vitest'
import { guardTransition } from '../guard'

const order = { type: 'delivery' as const, status: 'preparing' as const }

describe('guardTransition', () => {
  it('rejects when there is no session', () => {
    expect(guardTransition(null, order, 'ready').ok).toBe(false)
  })
  it('rejects a courier trying an operator-only transition', () => {
    expect(guardTransition({ role: 'courier' }, order, 'ready').ok).toBe(false)
  })
  it('allows a courier hand-off transition', () => {
    const r = guardTransition({ role: 'courier' }, { type: 'delivery', status: 'ready' }, 'out_for_delivery')
    expect(r.ok).toBe(true)
  })
  it('allows staff operator transition', () => {
    expect(guardTransition({ role: 'staff' }, order, 'ready').ok).toBe(true)
  })
  it('rejects an illegal transition even for staff', () => {
    expect(guardTransition({ role: 'staff' }, order, 'delivered').ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/orders/__tests__/guard.test.ts`
Expected: FAIL — cannot resolve `../guard`.

- [ ] **Step 3: Write the pure guard**

```ts
// lib/orders/guard.ts
import type { Role } from '@/lib/auth/passcode'
import { canTransition, courierActions, type OrderStatus, type OrderType } from './statusFlow'

type Session = { role: Role } | null
type OrderRef = { type: OrderType; status: OrderStatus }

// Pure guard: role + transition legality. Exported for unit testing.
export function guardTransition(
  session: Session,
  order: OrderRef,
  to: OrderStatus,
): { ok: true } | { ok: false; error: string } {
  if (!session) return { ok: false, error: 'unauthorized' }
  if (!canTransition(order.type, order.status, to)) return { ok: false, error: 'illegal_transition' }
  if (session.role === 'courier') {
    // Courier may only drive the delivery hand-off steps. Staff may drive any legal transition.
    const allowed = courierActions(order.status).some((a) => a.to === to)
    if (!allowed) return { ok: false, error: 'forbidden_for_role' }
  }
  return { ok: true }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/orders/__tests__/guard.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the server action**

```ts
// lib/orders/updateStatus.ts
'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/session'
import { guardTransition } from './guard'
import type { OrderStatus, OrderType } from './statusFlow'

export async function updateOrderStatus(
  orderId: string,
  to: OrderStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession()
  const admin = createAdminClient()
  const { data: order, error: loadErr } = await admin
    .from('orders').select('type, status').eq('id', orderId).single()
  if (loadErr || !order) return { ok: false, error: 'not_found' }

  const guard = guardTransition(session, order as { type: OrderType; status: OrderStatus }, to)
  if (!guard.ok) return guard

  const { error: updErr } = await admin.from('orders').update({ status: to }).eq('id', orderId)
  if (updErr) return { ok: false, error: 'update_failed' }

  revalidatePath('/admin')
  revalidatePath('/courier')
  return { ok: true }
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/orders/guard.ts lib/orders/updateStatus.ts lib/orders/__tests__/guard.test.ts
git commit -m "feat(orders): transition guard + updateOrderStatus server action"
```

---

### Task 7: Operator screen `/admin` + login

**Files:**
- Create: `app/admin/layout.tsx`, `app/admin/page.tsx`, `app/admin/login/page.tsx`
- Create: `components/admin/LoginForm.tsx`, `components/admin/OrderCard.tsx`, `components/admin/StatusButton.tsx`, `components/admin/OrderBoard.tsx`
- Create: `lib/orders/format.ts` (shared card helpers)

**Interfaces:**
- Consumes: `listActiveOrders`, `AdminOrder` (Task 5); `operatorActions`, `STATUS_LABEL_RU` (Task 4); `updateOrderStatus` (Task 6); `login` (Task 2); `formatZloty` (`lib/menu/price.ts`); `Icon`.
- Produces: `formatOrderTime(iso: string): string`, `orderNumber(token: string): string` in `lib/orders/format.ts`.

- [ ] **Step 1: Shared card formatting helpers**

```ts
// lib/orders/format.ts
export function orderNumber(token: string): string {
  return '#' + token.slice(0, 8).toUpperCase()
}
export function formatOrderTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}
```

- [ ] **Step 2: Admin layout (renders its own `<html>/<body>`)**

The repo's root `app/layout.tsx` returns `children` only — `<html>/<body>` are provided by `app/[locale]/layout.tsx`. Since `/admin` is outside `[locale]`, its layout MUST render `<html>/<body>` itself (with the font CSS variables), or Next errors with "missing <html>/<body>". `globals.css` is already imported by the root layout, so don't re-import it.

```tsx
// app/admin/layout.tsx
import { display, body as bodyFont } from '@/lib/fonts'

export const dynamic = 'force-dynamic'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${display.variable} ${bodyFont.variable}`}>
      <body className="min-h-screen bg-paper text-ink">{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Login form (client) + login page**

```tsx
// components/admin/LoginForm.tsx
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/auth/actions'
import type { Role } from '@/lib/auth/passcode'

export function LoginForm({ role, redirectTo }: { role: Role; redirectTo: string }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const router = useRouter()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    start(async () => {
      const res = await login(role, code)
      if (res.ok) router.replace(redirectTo)
      else setError(res.error === 'not_configured' ? 'Не настроено (нет AUTH_SECRET/кода)' : 'Неверный код')
    })
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-24 flex max-w-xs flex-col gap-3 px-6">
      <h1 className="text-2xl font-extrabold">{role === 'courier' ? 'Вход курьера' : 'Вход персонала'}</h1>
      <input
        type="password" inputMode="numeric" autoFocus value={code}
        onChange={(e) => setCode(e.target.value)} placeholder="Код доступа"
        className="rounded-xl border border-line bg-panel px-4 py-3 text-base outline-none focus:border-beet"
      />
      {error && <p className="text-sm font-semibold text-beet">{error}</p>}
      <button
        type="submit" disabled={pending || !code}
        className="rounded-xl bg-beet px-4 py-3 font-bold text-paper disabled:opacity-50"
      >
        {pending ? 'Проверяем…' : 'Войти'}
      </button>
    </form>
  )
}
```

```tsx
// app/admin/login/page.tsx
import { LoginForm } from '@/components/admin/LoginForm'
export const dynamic = 'force-dynamic'
export default function AdminLoginPage() {
  return <LoginForm role="staff" redirectTo="/admin" />
}
```

- [ ] **Step 4: Status button (client)**

```tsx
// components/admin/StatusButton.tsx
'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrderStatus } from '@/lib/orders/updateStatus'
import type { StatusAction } from '@/lib/orders/statusFlow'

const TONE: Record<StatusAction['tone'], string> = {
  primary: 'bg-beet text-paper',
  danger: 'border border-beet text-beet',
  neutral: 'border border-line text-ink',
}

export function StatusButton({ orderId, action }: { orderId: string; action: StatusAction }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <button
      type="button" disabled={pending}
      onClick={() => start(async () => { await updateOrderStatus(orderId, action.to); router.refresh() })}
      className={`rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50 ${TONE[action.tone]}`}
    >
      {action.label}
    </button>
  )
}
```

- [ ] **Step 5: Order card + board**

```tsx
// components/admin/OrderCard.tsx
import { Icon } from '@/components/Icon'
import { formatZloty } from '@/lib/menu/price'
import { STATUS_LABEL_RU, operatorActions } from '@/lib/orders/statusFlow'
import { orderNumber, formatOrderTime } from '@/lib/orders/format'
import { StatusButton } from './StatusButton'
import type { AdminOrder } from '@/lib/orders/adminOrders'

export function OrderCard({ order }: { order: AdminOrder }) {
  const actions = operatorActions(order.type, order.status)
  return (
    <article className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-center justify-between">
        <span className="font-extrabold text-beet">{orderNumber(order.public_token)}</span>
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          {order.type === 'pickup' ? 'Самовывоз' : 'Доставка'} · {STATUS_LABEL_RU[order.status]}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">{formatOrderTime(order.created_at)}</p>

      <ul className="mt-3 space-y-1 text-sm">
        {order.order_items.map((i, idx) => (
          <li key={idx} className="flex justify-between gap-3">
            <span><span className="text-beet">{i.qty}×</span> {i.name}
              {i.selected_options?.length > 0 && (
                <span className="text-muted"> · {i.selected_options.map((o) => o.optionName).join(', ')}</span>
              )}
            </span>
            <span className="whitespace-nowrap font-semibold">{formatZloty(i.line_total, 'pl')}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-sm">
        <span className="flex items-center gap-1 font-semibold"><Icon name="phone" size={14} className="text-beet" />{order.customer_name} · {order.customer_phone}</span>
        {order.type === 'delivery' && order.address_snapshot?.formatted && (
          <span className="flex items-center gap-1 text-ink/80"><Icon name="pin" size={14} className="text-beet" />{order.address_snapshot.formatted}</span>
        )}
        <span className="flex items-center gap-1 text-ink/80"><Icon name="wallet" size={14} className="text-beet" />
          {order.cash_change_from ? `Сдача с ${formatZloty(order.cash_change_from, 'pl')}` : 'Наличные'}
        </span>
        <span className="ml-auto text-lg font-extrabold text-beet">{formatZloty(order.total, 'pl')}</span>
      </div>

      {order.notes && (
        <p className="mt-2 flex items-center gap-1 text-sm text-ink/70">
          <Icon name="receipt" size={14} className="text-muted" />{order.notes}
        </p>
      )}

      {actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((a) => <StatusButton key={a.to} orderId={order.id} action={a} />)}
        </div>
      )}
    </article>
  )
}
```

```tsx
// components/admin/OrderBoard.tsx
import { OrderCard } from './OrderCard'
import type { AdminOrder } from '@/lib/orders/adminOrders'
import type { OrderStatus } from '@/lib/orders/statusFlow'

const LANES: { title: string; statuses: OrderStatus[] }[] = [
  { title: 'Новые', statuses: ['pending'] },
  { title: 'Приняты', statuses: ['confirmed'] },
  { title: 'Готовятся', statuses: ['preparing'] },
  { title: 'Готовы', statuses: ['ready'] },
  { title: 'В доставке', statuses: ['out_for_delivery'] },
  { title: 'Завершены', statuses: ['delivered', 'picked_up', 'cancelled', 'rejected'] },
]

export function OrderBoard({ orders }: { orders: AdminOrder[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {LANES.map((lane) => {
        const cards = orders.filter((o) => lane.statuses.includes(o.status))
        return (
          <section key={lane.title}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted">
              {lane.title} <span className="rounded-full bg-line px-2 text-xs">{cards.length}</span>
            </h2>
            <div className="space-y-3">
              {cards.length === 0
                ? <p className="text-sm text-muted">—</p>
                : cards.map((o) => <OrderCard key={o.id} order={o} />)}
            </div>
          </section>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 6: Admin page**

```tsx
// app/admin/page.tsx
import { listActiveOrders } from '@/lib/orders/adminOrders'
import { OrderBoard } from '@/components/admin/OrderBoard'
import { OrderStream } from '@/components/admin/OrderStream' // added in Task 9

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const orders = await listActiveOrders()
  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Пульт кухни</h1>
        <OrderStream role="staff" />
      </div>
      <OrderBoard orders={orders} />
    </main>
  )
}
```

> If executing before Task 9, temporarily stub `OrderStream` as `() => null` and remove the import, or implement Task 9 first. Recommended order: do Task 9 before wiring the import.

- [ ] **Step 7: Verify by running the app**

Log in and drive one order:
1. Ensure a `pending` order exists (place one via the client flow, or in Studio).
2. Open `http://localhost:3100/admin` → redirected to `/admin/login` → enter `kitchen42` → board loads.
3. Click **Принять** on a new order → it moves to «Приняты» after refresh. Screenshot to confirm.

Run: `npm run lint`
Expected: no errors in new files.

- [ ] **Step 8: Commit**

```bash
git add app/admin components/admin lib/orders/format.ts
git commit -m "feat(admin): operator order board + passcode login"
```

---

### Task 8: Courier screen `/courier` + login

**Files:**
- Create: `app/courier/layout.tsx`, `app/courier/page.tsx`, `app/courier/login/page.tsx`
- Create: `components/courier/CourierCard.tsx`

**Interfaces:**
- Consumes: `listCourierQueue`, `AdminOrder` (Task 5); `courierActions` (Task 4); `updateOrderStatus` (Task 6); `StatusButton` (Task 7); `formatZloty`; `Icon`; `orderNumber`.

- [ ] **Step 1: Courier layout**

```tsx
// app/courier/layout.tsx (renders its own <html>/<body>, same reason as admin)
import { display, body as bodyFont } from '@/lib/fonts'

export const dynamic = 'force-dynamic'

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${display.variable} ${bodyFont.variable}`}>
      <body className="min-h-screen bg-paper text-ink">{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Courier login page**

```tsx
// app/courier/login/page.tsx
import { LoginForm } from '@/components/admin/LoginForm'
export const dynamic = 'force-dynamic'
export default function CourierLoginPage() {
  return <LoginForm role="courier" redirectTo="/courier" />
}
```

- [ ] **Step 3: Courier card (big, mobile-first)**

```tsx
// components/courier/CourierCard.tsx
import { Icon } from '@/components/Icon'
import { formatZloty } from '@/lib/menu/price'
import { courierActions } from '@/lib/orders/statusFlow'
import { orderNumber } from '@/lib/orders/format'
import { StatusButton } from '@/components/admin/StatusButton'
import type { AdminOrder } from '@/lib/orders/adminOrders'

export function CourierCard({ order }: { order: AdminOrder }) {
  const addr = order.address_snapshot?.formatted ?? '—'
  return (
    <article className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-center justify-between">
        <span className="font-extrabold text-beet">{orderNumber(order.public_token)}</span>
        <span className="text-lg font-extrabold text-beet">{formatZloty(order.total, 'pl')}</span>
      </div>
      <a href={`tel:${order.customer_phone}`} className="mt-3 flex items-center gap-2 text-base font-bold">
        <Icon name="phone" size={18} className="text-beet" />{order.customer_name} · {order.customer_phone}
      </a>
      <p className="mt-2 flex items-start gap-2 text-base"><Icon name="pin" size={18} className="mt-0.5 shrink-0 text-beet" />{addr}</p>
      <p className="mt-2 flex items-center gap-2 text-sm text-ink/80"><Icon name="wallet" size={16} className="text-beet" />
        {order.cash_change_from ? `Наличные · сдача с ${formatZloty(order.cash_change_from, 'pl')}` : 'Наличные'}
      </p>
      <ul className="mt-2 text-sm text-muted">
        {order.order_items.map((i, idx) => <li key={idx}>{i.qty}× {i.name}</li>)}
      </ul>
      <div className="mt-4 flex gap-2">
        {courierActions(order.status).map((a) => <StatusButton key={a.to} orderId={order.id} action={a} />)}
      </div>
    </article>
  )
}
```

- [ ] **Step 4: Courier page (two sections)**

```tsx
// app/courier/page.tsx
import { listCourierQueue } from '@/lib/orders/adminOrders'
import { CourierCard } from '@/components/courier/CourierCard'
import { OrderStream } from '@/components/admin/OrderStream' // Task 9

export const dynamic = 'force-dynamic'

export default async function CourierPage() {
  const queue = await listCourierQueue()
  const ready = queue.filter((o) => o.status === 'ready')
  const enRoute = queue.filter((o) => o.status === 'out_for_delivery')
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Курьер</h1>
        <OrderStream role="courier" />
      </div>
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-muted">К доставке ({ready.length})</h2>
        <div className="space-y-3">{ready.length ? ready.map((o) => <CourierCard key={o.id} order={o} />) : <p className="text-sm text-muted">Нет готовых заказов</p>}</div>
      </section>
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-muted">В пути ({enRoute.length})</h2>
        <div className="space-y-3">{enRoute.map((o) => <CourierCard key={o.id} order={o} />)}</div>
      </section>
    </main>
  )
}
```

- [ ] **Step 5: Verify by running the app**

1. In `/admin`, drive an order to `ready` (delivery type).
2. Open `http://localhost:3100/courier` → login with `ride99` → the order appears under «К доставке».
3. Click **Забрал** → moves to «В пути». Click **Доставлен** → disappears from queue; in `/admin` it shows «Доставлен». Screenshot both.

- [ ] **Step 6: Commit**

```bash
git add app/courier components/courier
git commit -m "feat(courier): delivery queue screen + passcode login"
```

---

### Task 9: Realtime — publication migration + SSE route + client stream/sound

**Files:**
- Create: `supabase/migrations/0004_realtime_orders.sql`
- Create: `app/api/admin/stream/route.ts`
- Create: `components/admin/OrderStream.tsx`
- Create: `public/sound/new-order.mp3` (short chime; or reuse a bundled asset)

**Interfaces:**
- Consumes: `getSession` (Task 2); `createAdminClient` (service-role Supabase for Realtime).

- [ ] **Step 1: Realtime publication migration**

```sql
-- supabase/migrations/0004_realtime_orders.sql
-- Expose orders changes to Realtime (postgres_changes). Server subscribes via
-- service-role; the SSE route re-broadcasts to cookie-gated staff/courier clients.
alter publication supabase_realtime add table orders;
```

Apply locally:

Run: `docker exec -i supabase_db_SmacznegoDelivery psql -U postgres -d postgres < supabase/migrations/0004_realtime_orders.sql`
Expected: `ALTER PUBLICATION` (or, if already added, a duplicate-object error — safe to ignore).

- [ ] **Step 2: SSE Route Handler (cookie-gated, service-role Realtime → SSE)**

```ts
// app/api/admin/stream/route.ts
import { getSession } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return new Response('unauthorized', { status: 401 })

  const admin = createAdminClient()
  const encoder = new TextEncoder()
  let heartbeat: ReturnType<typeof setInterval>
  let channel: ReturnType<typeof admin.channel>

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      send({ type: 'ready' })
      // SSE comment heartbeat keeps proxies from closing an idle connection.
      heartbeat = setInterval(() => controller.enqueue(encoder.encode(': ping\n\n')), 25_000)

      channel = admin
        .channel('orders-stream')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
          const row = (payload.new ?? payload.old) as { status?: string; type?: string }
          send({ type: 'order', event: payload.eventType, status: row?.status, orderType: row?.type })
        })
        .subscribe()
    },
    // Runs when the client disconnects — tear down the heartbeat + Realtime channel.
    cancel() {
      clearInterval(heartbeat)
      admin.removeChannel(channel)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
```

- [ ] **Step 3: Client stream component (subscribe + refresh + sound)**

```tsx
// components/admin/OrderStream.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/Icon'
import type { Role } from '@/lib/auth/passcode'

export function OrderStream({ role }: { role: Role }) {
  const router = useRouter()
  const [soundOn, setSoundOn] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/admin/stream')
    let pollTimer: ReturnType<typeof setInterval> | null = null

    es.onmessage = (e) => {
      let msg: { type?: string; event?: string; status?: string; orderType?: string } = {}
      try { msg = JSON.parse(e.data) } catch { return }
      if (msg.type !== 'order') return
      router.refresh()
      const isNewForRole =
        (role === 'staff' && msg.event === 'INSERT' && msg.status === 'pending') ||
        (role === 'courier' && msg.status === 'ready' && msg.orderType === 'delivery')
      if (isNewForRole) audio.current?.play().catch(() => {})
    }
    // Fallback polling if SSE never connects / drops.
    es.onerror = () => { if (!pollTimer) pollTimer = setInterval(() => router.refresh(), 15_000) }

    return () => { es.close(); if (pollTimer) clearInterval(pollTimer) }
  }, [role, router])

  return (
    <>
      <audio ref={audio} src="/sound/new-order.mp3" preload="auto" />
      <button
        type="button"
        onClick={() => { setSoundOn(true); audio.current?.play().catch(() => {}) }}
        className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-bold text-muted"
        title="Разрешить звук уведомлений"
      >
        <Icon name={soundOn ? 'check' : 'clock'} size={14} />
        {soundOn ? 'Звук включён' : 'Включить звук'}
      </button>
    </>
  )
}
```

> `OrderStream` imports `Icon` from `@/components/Icon` (add the import at the top alongside the others).

- [ ] **Step 4: Add the sound asset and verify end-to-end**

Add a short chime at `public/sound/new-order.mp3` (any small royalty-free notification sound).

Verify:
1. Open `/admin` (logged in) in the browser, click **Включить звук**.
2. In another tab place a new order via the client flow (or insert a `pending` row in Studio).
3. The board updates within ~1s **without manual refresh**, and the chime plays. Screenshot.
4. Kill the SSE (stop dev server briefly / offline) → confirm the 15s poll fallback still refreshes after reconnect.

- [ ] **Step 5: Wire `OrderStream` into pages**

Ensure `app/admin/page.tsx` and `app/courier/page.tsx` import and render `<OrderStream role=... />` (already referenced in Tasks 7–8).

Run: `npm run lint && npm test`
Expected: lint clean; all unit tests pass.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0004_realtime_orders.sql app/api/admin/stream components/admin/OrderStream.tsx public/sound
git commit -m "feat(realtime): gated SSE order stream + sound for admin/courier"
```

---

## Final verification (whole «прямая часть» end-to-end)

Drive the full loop in the browser on `http://localhost:3100`:

1. **Client:** menu → add dish (with options) → cart → checkout (delivery) → order placed (`pending`).
2. **Operator `/admin`:** new order appears instantly + chime → Принять → Готовим → Готов.
3. **Courier `/courier`:** order shows under «К доставке» → Забрал → Доставлен.
4. **Operator `/admin`:** order now under «Завершены» as «Доставлен».
5. Confirm the DB row status progression via `docker exec supabase_db_SmacznegoDelivery psql -U postgres -d postgres -c "select public_token, status from orders order by created_at desc limit 3;"`.

Then: `npm test` (all green), `npm run lint` (clean).

---

## Self-review notes (coverage map)

| Spec section | Task(s) |
|---|---|
| §2 Авторизация (пароль, HMAC-cookie, гейт) | 1, 2, 3 |
| §3 Статусы и действия (оператор + курьер) | 4, 7, 8 |
| §3 Данные заказов / курьерская очередь | 5 |
| §3 Защита мутаций (роль в server action) | 6 |
| §4 Realtime (публикация, SSE, клиент, звук, фолбэк) | 9 |
| §5 Файлы/слои | 1–9 |
| §6 Тесты (statusFlow, passcode, courier filter, guard) | 1, 2, 4, 5, 6 |
