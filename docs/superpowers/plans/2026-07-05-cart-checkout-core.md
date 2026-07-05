# Phase 2a — Cart + Options + Checkout (core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the browsable menu into placeable orders — configure dishes with options, build a guest cart, check out on a single page (manual address, preorder time), and create a `pending` order server-side with full revalidation, landing on an order-status page.

**Architecture:** Guest cart lives client-side (localStorage + React context). All money math is pure and unit-tested. Order creation runs in a server action using a **service-role** Supabase client (`lib/supabase/admin.ts`) that bypasses RLS — the client is never trusted: dishes/options/prices/availability and all totals are recomputed from the DB. New order tables are private (RLS on, no public policies); only `restaurant_settings` is public-read. Address input is a swappable component (manual fields now; map/geocoding replaces it in Phase 2b) with a stable `AddressValue` output.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, TypeScript, Tailwind v4 `@theme`, next-intl, Supabase (Postgres + service-role client), Vitest + @testing-library/react.

## Global Constraints

- **Money:** integer **grosze** everywhere. All order totals are recomputed **server-side**; client amounts are display-only and never trusted.
- **Locales:** `['pl','uk','ru']`, default/fallback `'pl'`; new user-facing copy goes through next-intl message files (namespaces `cart`, `checkout`, `order`), never hardcoded.
- **Timezone:** `Europe/Warsaw` for all opening-hours / slot logic. Local wall-clock slots are converted to `timestamptz` by Postgres via `AT TIME ZONE 'Europe/Warsaw'`.
- **Icons:** SVG only (the `Icon` component) — no emoji.
- **Design:** dark-gourmet `@theme` tokens (`bg-espresso`, `bg-surface`, `text-gold`, `bg-gold`, `text-cream`, `text-muted`, `text-danger`, `border-line`, `text-espresso`) — no arbitrary color literals (food-photo gradient placeholders excepted).
- **Security:** the service-role key is server-only. `lib/supabase/admin.ts` must never be imported by a client component. New order/customer tables have RLS enabled with NO public policies; reads/writes happen only through the service-role client.
- **Payment:** `payment_method` is always `'cash'` (pay on delivery) in this phase.

### Shared types (defined in Task 2, consumed throughout)

```ts
// lib/cart/types.ts
export interface SelectedOption { groupId: string; groupName: string; optionId: string; optionName: string; priceDelta: number }
export interface CartItem { dishId: string; name: string; unitPrice: number; qty: number; selectedOptions: SelectedOption[] }
export type Cart = CartItem[]
```

```ts
// lib/settings/types.ts (defined in Task 5)
export interface DayHours { open: string; close: string } // "HH:MM"
export type WeeklyHours = Record<'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun', DayHours | null>
export interface Settings {
  name: string; phone: string; addressText: string
  lat: number; lng: number; deliveryRadiusM: number
  deliveryFee: number; freeDeliveryThreshold: number; minOrder: number // grosze
  hours: WeeklyHours; prepLeadMinutes: number
}
```

```ts
// lib/address/types.ts (defined in Task 9)
export interface AddressValue {
  street: string; building: string; apartment: string
  floor: string; entrance: string; intercom: string
  lat: number | null; lng: number | null; formatted: string
}
```

---

### Task 1: Order database schema + service-role client

**Files:**
- Create: `supabase/migrations/0002_orders.sql`
- Modify: `supabase/seed.sql` (append a `restaurant_settings` row)
- Create: `lib/supabase/admin.ts`
- Modify: `.env.local` (add `SUPABASE_SERVICE_ROLE_KEY`, not committed), `.env.example`
- Modify: `lib/supabase/types.ts` (regenerated)

**Interfaces:**
- Consumes: local Supabase (running).
- Produces: tables `restaurant_settings`, `customers`, `addresses`, `orders`, `order_items`; a seeded settings row; `createAdminClient()` returning a service-role Supabase client that bypasses RLS; regenerated `Database` type.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0002_orders.sql`:

```sql
create table restaurant_settings (
  id boolean primary key default true,
  name text not null,
  phone text not null,
  address_text text not null,
  lat double precision not null,
  lng double precision not null,
  delivery_radius_m int not null,
  delivery_fee int not null,               -- grosze
  free_delivery_threshold int not null,    -- grosze
  min_order int not null,                  -- grosze
  hours jsonb not null,                    -- {mon:{open,close}|null, ...}
  prep_lead_minutes int not null,
  constraint singleton check (id)
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  street text, building text, apartment text, floor text, entrance text, intercom text,
  lat double precision, lng double precision, formatted text,
  label text,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  public_token text not null unique,
  customer_id uuid references customers(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  type text not null check (type in ('delivery','pickup')),
  status text not null default 'pending'
    check (status in ('pending','confirmed','preparing','ready','out_for_delivery','delivered','picked_up','cancelled','rejected')),
  payment_method text not null default 'cash' check (payment_method = 'cash'),
  cash_change_from int,
  subtotal int not null,
  delivery_fee int not null default 0,
  discount int not null default 0,
  total int not null,
  notes text,
  address_snapshot jsonb,
  scheduled_for timestamptz,
  language text not null default 'pl',
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  dish_id uuid references dishes(id) on delete set null,
  name text not null,
  unit_price int not null,                 -- grosze
  qty int not null check (qty > 0),
  selected_options jsonb not null default '[]',
  line_total int not null
);

create index on order_items(order_id);
create index on orders(created_at);

-- restaurant_settings: public read (client needs fee/threshold/hours). No public write.
alter table restaurant_settings enable row level security;
create policy "public read" on restaurant_settings for select using (true);
grant select on restaurant_settings to anon, authenticated;

-- Order/customer tables: RLS on, NO policies. Only the service-role client (which
-- bypasses RLS) touches them. No grants to anon/authenticated => fully private.
alter table customers enable row level security;
alter table addresses enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
```

- [ ] **Step 2: Seed the settings row**

Append to `supabase/seed.sql`:

```sql
insert into restaurant_settings (id, name, phone, address_text, lat, lng, delivery_radius_m,
  delivery_fee, free_delivery_threshold, min_order, hours, prep_lead_minutes)
values (true, 'Smacznego', '+48 500 100 200', 'ul. Przykładowa 1, Warszawa',
  52.2297, 21.0122, 8000, 800, 6000, 3000,
  '{"mon":{"open":"11:00","close":"22:00"},"tue":{"open":"11:00","close":"22:00"},"wed":{"open":"11:00","close":"22:00"},"thu":{"open":"11:00","close":"22:00"},"fri":{"open":"11:00","close":"23:00"},"sat":{"open":"12:00","close":"23:00"},"sun":{"open":"12:00","close":"21:00"}}'::jsonb,
  40);
```

- [ ] **Step 3: Apply + regenerate types**

```bash
npx supabase db reset
npx supabase gen types typescript --local > lib/supabase/types.ts
```

Expected: reset runs both migrations + seed with no errors; `types.ts` now includes the five new tables.

- [ ] **Step 4: Add the service-role key to env**

`supabase status` prints `service_role key`. Add to `.env.local`:

```bash
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase status>
```

Add the placeholder to `.env.example`:

```bash
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 5: Create the service-role client**

Create `lib/supabase/admin.ts`:

```ts
import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Service-role client — bypasses RLS. SERVER-ONLY. Never import from a client component.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
```

```bash
npm install server-only
```

- [ ] **Step 6: Verify + commit**

```bash
npm run build
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select name, delivery_fee, min_order from restaurant_settings;"
```

Expected: build passes; the settings row prints (`Smacznego | 800 | 3000`).

```bash
git add supabase/migrations/0002_orders.sql supabase/seed.sql lib/supabase/admin.ts lib/supabase/types.ts .env.example package.json package-lock.json
git commit -m "feat: order schema (settings/customers/orders) + service-role client"
```

---

### Task 2: Cart domain types + totals

**Files:**
- Create: `lib/cart/types.ts`, `lib/cart/totals.ts`
- Test: `lib/cart/__tests__/totals.test.ts`

**Interfaces:**
- Consumes: `dishPriceGrosze` (`@/lib/menu/price`).
- Produces:
  - Types `SelectedOption`, `CartItem`, `Cart` (see Shared types).
  - `lineTotal(item: CartItem): number`
  - `cartSubtotal(cart: Cart): number`
  - `deliveryFee(subtotal: number, type: 'delivery'|'pickup', settings: {deliveryFee:number; freeDeliveryThreshold:number}): number`
  - `amountToFreeDelivery(subtotal: number, settings: {freeDeliveryThreshold:number}): number` (0 once reached)
  - `meetsMinOrder(subtotal: number, settings: {minOrder:number}): boolean`
  - `orderTotal(subtotal: number, fee: number): number`

- [ ] **Step 1: Write the failing tests**

Create `lib/cart/__tests__/totals.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { lineTotal, cartSubtotal, deliveryFee, amountToFreeDelivery, meetsMinOrder, orderTotal } from '@/lib/cart/totals'
import type { Cart } from '@/lib/cart/types'

const cart: Cart = [
  { dishId: 'd1', name: 'Barszcz', unitPrice: 3500, qty: 2, selectedOptions: [] },
  { dishId: 'd2', name: 'Pierogi', unitPrice: 2400, qty: 1, selectedOptions: [] },
]
const settings = { deliveryFee: 800, freeDeliveryThreshold: 6000, minOrder: 3000 }

describe('cart totals', () => {
  it('lineTotal multiplies unit price by qty', () => {
    expect(lineTotal(cart[0])).toBe(7000)
  })
  it('cartSubtotal sums line totals', () => {
    expect(cartSubtotal(cart)).toBe(9400)
  })
  it('deliveryFee is 0 for pickup', () => {
    expect(deliveryFee(2000, 'pickup', settings)).toBe(0)
  })
  it('deliveryFee is charged below threshold for delivery', () => {
    expect(deliveryFee(5000, 'delivery', settings)).toBe(800)
  })
  it('deliveryFee is free at/above threshold', () => {
    expect(deliveryFee(6000, 'delivery', settings)).toBe(0)
  })
  it('amountToFreeDelivery counts down and floors at 0', () => {
    expect(amountToFreeDelivery(5000, settings)).toBe(1000)
    expect(amountToFreeDelivery(6000, settings)).toBe(0)
  })
  it('meetsMinOrder checks the threshold', () => {
    expect(meetsMinOrder(2999, settings)).toBe(false)
    expect(meetsMinOrder(3000, settings)).toBe(true)
  })
  it('orderTotal adds fee to subtotal', () => {
    expect(orderTotal(9400, 800)).toBe(10200)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/cart/__tests__/totals.test.ts`
Expected: FAIL — cannot resolve `@/lib/cart/totals`.

- [ ] **Step 3: Implement types + totals**

Create `lib/cart/types.ts`:

```ts
export interface SelectedOption {
  groupId: string; groupName: string; optionId: string; optionName: string; priceDelta: number
}
export interface CartItem {
  dishId: string; name: string; unitPrice: number; qty: number; selectedOptions: SelectedOption[]
}
export type Cart = CartItem[]
```

Create `lib/cart/totals.ts`:

```ts
import type { Cart, CartItem } from './types'

export function lineTotal(item: CartItem): number {
  return item.unitPrice * item.qty
}
export function cartSubtotal(cart: Cart): number {
  return cart.reduce((sum, item) => sum + lineTotal(item), 0)
}
export function deliveryFee(
  subtotal: number,
  type: 'delivery' | 'pickup',
  settings: { deliveryFee: number; freeDeliveryThreshold: number },
): number {
  if (type === 'pickup') return 0
  return subtotal >= settings.freeDeliveryThreshold ? 0 : settings.deliveryFee
}
export function amountToFreeDelivery(subtotal: number, settings: { freeDeliveryThreshold: number }): number {
  return Math.max(0, settings.freeDeliveryThreshold - subtotal)
}
export function meetsMinOrder(subtotal: number, settings: { minOrder: number }): boolean {
  return subtotal >= settings.minOrder
}
export function orderTotal(subtotal: number, fee: number): number {
  return subtotal + fee
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/cart/__tests__/totals.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/cart
git commit -m "feat: cart types + totals math (tested)"
```

---

### Task 3: Opening hours + preorder slots

**Files:**
- Create: `lib/hours/hours.ts`
- Test: `lib/hours/__tests__/hours.test.ts`

**Interfaces:**
- Consumes: `WeeklyHours`, `DayHours` (define locally here, re-exported by Task 5's `lib/settings/types.ts` importing from here — to avoid duplication, DEFINE them in this file and have Task 5 re-export).
- Produces:
  - `WeeklyHours`, `DayHours` types.
  - `warsawNow(date: Date): { dayKey: keyof WeeklyHours; dateStr: string; minutes: number }` — Europe/Warsaw wall-clock parts (`dateStr` = `YYYY-MM-DD`, `minutes` = minutes since local midnight).
  - `isOpenNow(hours: WeeklyHours, now: Date): boolean`
  - `generateSlots(hours: WeeklyHours, prepLeadMinutes: number, now: Date, horizonDays?: number): { value: string; dayKey: keyof WeeklyHours; hhmm: string }[]` — 30-min local wall-clock slots (`value` = `YYYY-MM-DDTHH:MM`) within open windows, no earlier than `now + prepLeadMinutes`, over the next `horizonDays` (default 2).

- [ ] **Step 1: Write the failing tests**

Create `lib/hours/__tests__/hours.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { warsawNow, isOpenNow, generateSlots, type WeeklyHours } from '@/lib/hours/hours'

const hours: WeeklyHours = {
  mon: { open: '11:00', close: '22:00' }, tue: { open: '11:00', close: '22:00' },
  wed: { open: '11:00', close: '22:00' }, thu: { open: '11:00', close: '22:00' },
  fri: { open: '11:00', close: '22:00' }, sat: { open: '12:00', close: '22:00' },
  sun: null,
}

// 2026-07-06 is a Monday. 10:00 UTC = 12:00 Warsaw (CEST, +2).
const monNoonWarsaw = new Date('2026-07-06T10:00:00Z')
const monMorningWarsaw = new Date('2026-07-06T06:00:00Z') // 08:00 Warsaw, before open

describe('warsawNow', () => {
  it('derives Warsaw weekday + minutes', () => {
    const p = warsawNow(monNoonWarsaw)
    expect(p.dayKey).toBe('mon')
    expect(p.dateStr).toBe('2026-07-06')
    expect(p.minutes).toBe(12 * 60)
  })
})

describe('isOpenNow', () => {
  it('open during hours', () => {
    expect(isOpenNow(hours, monNoonWarsaw)).toBe(true)
  })
  it('closed before opening', () => {
    expect(isOpenNow(hours, monMorningWarsaw)).toBe(false)
  })
  it('closed on a day-off (sunday null)', () => {
    expect(isOpenNow(hours, new Date('2026-07-05T12:00:00Z'))).toBe(false) // Sunday
  })
})

describe('generateSlots', () => {
  const slots = generateSlots(hours, 40, monNoonWarsaw, 1)
  it('starts no earlier than now + prep lead, rounded up to :00/:30', () => {
    // 12:00 + 40min = 12:40 -> first slot 13:00
    expect(slots[0].hhmm).toBe('13:00')
    expect(slots[0].dayKey).toBe('mon')
    expect(slots[0].value).toBe('2026-07-06T13:00')
  })
  it('stops at closing time', () => {
    expect(slots.some((s) => s.hhmm === '22:00')).toBe(false)
    expect(slots[slots.length - 1].hhmm <= '21:30').toBe(true)
  })
  it('30-minute steps', () => {
    expect(slots[1].hhmm).toBe('13:30')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/hours/__tests__/hours.test.ts`
Expected: FAIL — cannot resolve `@/lib/hours/hours`.

- [ ] **Step 3: Implement**

Create `lib/hours/hours.ts`:

```ts
export interface DayHours { open: string; close: string }
export type WeeklyHours = Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', DayHours | null>

const DAY_KEYS: (keyof WeeklyHours)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function warsawNow(date: Date): { dayKey: keyof WeeklyHours; dateStr: string; minutes: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw', weekday: 'short',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]))
  const dateStr = `${parts.year}-${parts.month}-${parts.day}`
  const jsDay = new Date(`${dateStr}T00:00:00Z`).getUTCDay() // 0=Sun..6=Sat, stable from the date string
  const minutes = Number(parts.hour) * 60 + Number(parts.minute)
  return { dayKey: DAY_KEYS[jsDay], dateStr, minutes }
}

export function isOpenNow(hours: WeeklyHours, now: Date): boolean {
  const { dayKey, minutes } = warsawNow(now)
  const day = hours[dayKey]
  if (!day) return false
  return minutes >= toMinutes(day.open) && minutes < toMinutes(day.close)
}

export function generateSlots(
  hours: WeeklyHours, prepLeadMinutes: number, now: Date, horizonDays = 2,
): { value: string; dayKey: keyof WeeklyHours; hhmm: string }[] {
  const { dayKey, dateStr, minutes } = warsawNow(now)
  const startDayIndex = DAY_KEYS.indexOf(dayKey)
  const earliest = minutes + prepLeadMinutes
  const out: { value: string; dayKey: keyof WeeklyHours; hhmm: string }[] = []

  for (let d = 0; d < horizonDays; d++) {
    const key = DAY_KEYS[(startDayIndex + d) % 7]
    const day = hours[key]
    if (!day) continue
    const open = toMinutes(day.open)
    const close = toMinutes(day.close)
    // step at 30-min marks; on day 0 respect `earliest`
    let m = d === 0 ? Math.max(open, Math.ceil(earliest / 30) * 30) : open
    if (m < open) m = open
    const dateOfDay = addDaysToDateStr(dateStr, d)
    for (; m < close; m += 30) {
      const hhmm = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
      out.push({ value: `${dateOfDay}T${hhmm}`, dayKey: key, hhmm })
    }
  }
  return out
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const base = new Date(Date.UTC(y, mo - 1, d))
  base.setUTCDate(base.getUTCDate() + days)
  return `${base.getUTCFullYear()}-${pad(base.getUTCMonth() + 1)}-${pad(base.getUTCDate())}`
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/hours/__tests__/hours.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/hours
git commit -m "feat: opening-hours + preorder slot generation (Europe/Warsaw, tested)"
```

---

### Task 4: Polish phone validation

**Files:**
- Create: `lib/phone/phone.ts`
- Test: `lib/phone/__tests__/phone.test.ts`

**Interfaces:**
- Produces:
  - `normalizePhone(input: string): string` — strips spaces/dashes/parens, keeps a leading `+`.
  - `isValidPlPhone(input: string): boolean` — accepts a 9-digit national number, optionally prefixed `+48`/`48`/`0`.

- [ ] **Step 1: Write the failing tests**

Create `lib/phone/__tests__/phone.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { normalizePhone, isValidPlPhone } from '@/lib/phone/phone'

describe('normalizePhone', () => {
  it('strips spaces, dashes, parens; keeps leading +', () => {
    expect(normalizePhone(' +48 500-100 200 ')).toBe('+48500100200')
    expect(normalizePhone('(500) 100 200')).toBe('500100200')
  })
})

describe('isValidPlPhone', () => {
  it('accepts 9 digits with or without +48/48/0 prefix', () => {
    expect(isValidPlPhone('500100200')).toBe(true)
    expect(isValidPlPhone('+48 500 100 200')).toBe(true)
    expect(isValidPlPhone('48500100200')).toBe(true)
    expect(isValidPlPhone('0500100200')).toBe(true)
  })
  it('rejects wrong length or letters', () => {
    expect(isValidPlPhone('12345')).toBe(false)
    expect(isValidPlPhone('50010020a')).toBe(false)
    expect(isValidPlPhone('')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/phone/__tests__/phone.test.ts`
Expected: FAIL — cannot resolve `@/lib/phone/phone`.

- [ ] **Step 3: Implement**

Create `lib/phone/phone.ts`:

```ts
export function normalizePhone(input: string): string {
  const trimmed = input.trim()
  const plus = trimmed.startsWith('+') ? '+' : ''
  return plus + trimmed.replace(/[^\d]/g, '')
}

export function isValidPlPhone(input: string): boolean {
  let digits = normalizePhone(input).replace(/^\+/, '')
  if (digits.startsWith('48')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = digits.slice(1)
  return /^\d{9}$/.test(digits)
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/phone/__tests__/phone.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/phone
git commit -m "feat: Polish phone validation/normalization (tested)"
```

---

### Task 5: Settings data-access + provider

**Files:**
- Create: `lib/settings/types.ts`, `lib/settings/getSettings.ts`, `components/SettingsProvider.tsx`
- Modify: `app/[locale]/layout.tsx` (fetch settings, wrap children in `SettingsProvider`)

**Interfaces:**
- Consumes: `createClient` (`@/lib/supabase/server`), `WeeklyHours`/`DayHours` (`@/lib/hours/hours`).
- Produces:
  - `Settings` type (see Shared types) — `lib/settings/types.ts` re-exports `WeeklyHours`/`DayHours` from `@/lib/hours/hours`.
  - `getSettings(): Promise<Settings>` (server) — reads the singleton row, maps snake_case → camelCase.
  - `SettingsProvider` (client) + `useSettings(): Settings` hook.

- [ ] **Step 1: Define the Settings type**

Create `lib/settings/types.ts`:

```ts
export type { WeeklyHours, DayHours } from '@/lib/hours/hours'
import type { WeeklyHours } from '@/lib/hours/hours'

export interface Settings {
  name: string
  phone: string
  addressText: string
  lat: number
  lng: number
  deliveryRadiusM: number
  deliveryFee: number
  freeDeliveryThreshold: number
  minOrder: number
  hours: WeeklyHours
  prepLeadMinutes: number
}
```

- [ ] **Step 2: Implement getSettings**

Create `lib/settings/getSettings.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import type { Settings } from './types'
import type { WeeklyHours } from '@/lib/hours/hours'

export async function getSettings(): Promise<Settings> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('restaurant_settings').select('*').single()
  if (error || !data) throw new Error(`getSettings failed: ${error?.message ?? 'no settings row'}`)
  return {
    name: data.name,
    phone: data.phone,
    addressText: data.address_text,
    lat: data.lat,
    lng: data.lng,
    deliveryRadiusM: data.delivery_radius_m,
    deliveryFee: data.delivery_fee,
    freeDeliveryThreshold: data.free_delivery_threshold,
    minOrder: data.min_order,
    hours: data.hours as WeeklyHours,
    prepLeadMinutes: data.prep_lead_minutes,
  }
}
```

- [ ] **Step 3: Implement the provider**

Create `components/SettingsProvider.tsx`:

```tsx
'use client'
import { createContext, useContext } from 'react'
import type { Settings } from '@/lib/settings/types'

const SettingsContext = createContext<Settings | null>(null)

export function SettingsProvider({ value, children }: { value: Settings; children: React.ReactNode }) {
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): Settings {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
```

- [ ] **Step 4: Wire the provider into the locale layout**

In `app/[locale]/layout.tsx`, fetch settings and wrap children (inside `NextIntlClientProvider`). Add the import `import { getSettings } from '@/lib/settings/getSettings'` and `import { SettingsProvider } from '@/components/SettingsProvider'`, then in the component body after `const messages = await getMessages()`:

```tsx
  const settings = await getSettings()
```

and change the returned provider to:

```tsx
      <body>
        <NextIntlClientProvider messages={messages}>
          <SettingsProvider value={settings}>{children}</SettingsProvider>
        </NextIntlClientProvider>
      </body>
```

- [ ] **Step 5: Verify + commit**

Run: `npm run build`
Expected: PASS (settings fetched at build/render; `/pl` etc. still render).

```bash
git add lib/settings components/SettingsProvider.tsx app/[locale]/layout.tsx
git commit -m "feat: settings data-access + SettingsProvider"
```

---

### Task 6: Cart state (context + localStorage)

**Files:**
- Create: `lib/cart/itemKey.ts`, `components/CartProvider.tsx`
- Modify: `app/[locale]/layout.tsx` (wrap children in `CartProvider`)
- Test: `components/__tests__/CartProvider.test.tsx`

**Interfaces:**
- Consumes: `CartItem`, `Cart` (`@/lib/cart/types`), `cartSubtotal` (`@/lib/cart/totals`).
- Produces:
  - `itemKey(item: CartItem): string` — stable identity from `dishId` + sorted selected option ids (so the same configuration stacks).
  - `CartProvider` (client) persisting to `localStorage` key `smacznego-cart`.
  - `useCart(): { items: Cart; count: number; subtotal: number; addItem(item: CartItem): void; setQty(key: string, qty: number): void; removeItem(key: string): void; clear(): void; keyOf(item: CartItem): string }`.

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/CartProvider.test.tsx`:

```tsx
import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { CartProvider, useCart } from '@/components/CartProvider'
import type { CartItem } from '@/lib/cart/types'

const dish: CartItem = { dishId: 'd1', name: 'Barszcz', unitPrice: 2800, qty: 1, selectedOptions: [] }

function Harness() {
  const cart = useCart()
  return (
    <div>
      <span data-testid="count">{cart.count}</span>
      <span data-testid="subtotal">{cart.subtotal}</span>
      <button onClick={() => cart.addItem(dish)}>add</button>
      <button onClick={() => cart.clear()}>clear</button>
    </div>
  )
}

describe('CartProvider', () => {
  beforeEach(() => localStorage.clear())

  it('adds items and stacks identical configs, exposes count + subtotal', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(<CartProvider><Harness /></CartProvider>)
    await user.click(screen.getByText('add'))
    await user.click(screen.getByText('add'))
    expect(screen.getByTestId('count').textContent).toBe('2')       // 2 units
    expect(screen.getByTestId('subtotal').textContent).toBe('5600') // 2 * 2800
  })

  it('persists to localStorage', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(<CartProvider><Harness /></CartProvider>)
    await user.click(screen.getByText('add'))
    expect(JSON.parse(localStorage.getItem('smacznego-cart')!)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run components/__tests__/CartProvider.test.tsx`
Expected: FAIL — cannot resolve `@/components/CartProvider`.

- [ ] **Step 3: Implement itemKey**

Create `lib/cart/itemKey.ts`:

```ts
import type { CartItem } from './types'

export function itemKey(item: CartItem): string {
  const opts = item.selectedOptions.map((o) => o.optionId).sort().join(',')
  return `${item.dishId}|${opts}`
}
```

- [ ] **Step 4: Implement CartProvider**

Create `components/CartProvider.tsx`:

```tsx
'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import type { Cart, CartItem } from '@/lib/cart/types'
import { cartSubtotal } from '@/lib/cart/totals'
import { itemKey } from '@/lib/cart/itemKey'

const STORAGE_KEY = 'smacznego-cart'

interface CartApi {
  items: Cart; count: number; subtotal: number
  addItem(item: CartItem): void
  setQty(key: string, qty: number): void
  removeItem(key: string): void
  clear(): void
  keyOf(item: CartItem): string
}

const CartContext = createContext<CartApi | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Cart>([])

  // hydrate once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch { /* ignore corrupt storage */ }
  }, [])

  // persist on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  function addItem(item: CartItem) {
    setItems((prev) => {
      const key = itemKey(item)
      const existing = prev.find((i) => itemKey(i) === key)
      if (existing) return prev.map((i) => (itemKey(i) === key ? { ...i, qty: i.qty + item.qty } : i))
      return [...prev, item]
    })
  }
  function setQty(key: string, qty: number) {
    setItems((prev) =>
      qty <= 0 ? prev.filter((i) => itemKey(i) !== key) : prev.map((i) => (itemKey(i) === key ? { ...i, qty } : i)),
    )
  }
  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => itemKey(i) !== key))
  }
  function clear() { setItems([]) }

  const count = items.reduce((n, i) => n + i.qty, 0)
  const subtotal = cartSubtotal(items)

  return (
    <CartContext.Provider value={{ items, count, subtotal, addItem, setQty, removeItem, clear, keyOf: itemKey }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
```

- [ ] **Step 5: Wire CartProvider into the locale layout**

In `app/[locale]/layout.tsx`, wrap children with `CartProvider` (inside `SettingsProvider`). Add `import { CartProvider } from '@/components/CartProvider'` and nest:

```tsx
          <SettingsProvider value={settings}>
            <CartProvider>{children}</CartProvider>
          </SettingsProvider>
```

- [ ] **Step 6: Run to verify pass + build**

Run: `npx vitest run components/__tests__/CartProvider.test.tsx`
Expected: PASS (2 tests).
Run: `npm test` then `npm run build` — all green.

- [ ] **Step 7: Commit**

```bash
git add lib/cart/itemKey.ts components/CartProvider.tsx components/__tests__/CartProvider.test.tsx app/[locale]/layout.tsx
git commit -m "feat: guest cart context with localStorage persistence"
```

---

### Task 7: Option picker + add-to-cart on dish cards

**Files:**
- Create: `components/menu/OptionSheet.tsx`, `components/menu/AddToCartButton.tsx`
- Modify: `components/menu/DishCard.tsx` (replace the inert add button with `AddToCartButton`)
- Modify: `messages/pl.json`, `messages/uk.json`, `messages/ru.json` (add `cart` namespace)
- Test: `components/menu/__tests__/OptionSheet.test.tsx`

**Interfaces:**
- Consumes: `useCart` (`@/components/CartProvider`), `dishPriceGrosze` + `formatZloty` (`@/lib/menu/price`), `LocalizedDish`/`LocalizedOptionGroup` (`@/lib/menu/types`), `Icon`, `SelectedOption`/`CartItem` (`@/lib/cart/types`), `Locale`.
- Produces:
  - `AddToCartButton({ dish, locale })` (client) — for a dish with no option groups adds directly; otherwise opens `OptionSheet`.
  - `OptionSheet({ dish, locale, onClose })` (client) — renders each option group (required = single-select radios enforcing exactly 1; optional = checkboxes), a qty stepper, a live total, and an "Add" button that builds a `CartItem` (unitPrice via `dishPriceGrosze`) and calls `addItem`.

- [ ] **Step 1: Add the `cart` message namespace**

Add a `"cart"` block to each `messages/*.json` (siblings of `nav`/`menu`/`home`):

`pl.json`: `"cart": { "add": "Dodaj", "addToCart": "Do koszyka", "choose": "Wybierz", "qty": "Ilość", "total": "Razem", "required": "wymagane" }`
`uk.json`: `"cart": { "add": "Додати", "addToCart": "До кошика", "choose": "Оберіть", "qty": "Кількість", "total": "Разом", "required": "обов'язково" }`
`ru.json`: `"cart": { "add": "Добавить", "addToCart": "В корзину", "choose": "Выберите", "qty": "Количество", "total": "Итого", "required": "обязательно" }`

- [ ] **Step 2: Write the failing test**

Create `components/menu/__tests__/OptionSheet.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, it, expect, vi } from 'vitest'
import { OptionSheet } from '@/components/menu/OptionSheet'
import { CartProvider, useCart } from '@/components/CartProvider'
import type { LocalizedDish } from '@/lib/menu/types'

const messages = { cart: { add: 'Dodaj', choose: 'Wybierz', qty: 'Ilość', total: 'Razem', required: 'wymagane' } }

const dish: LocalizedDish = {
  id: 'd1', name: 'Barszcz', description: '', basePrice: 2800, photoUrl: null, isAvailable: true, tags: [],
  optionGroups: [
    { id: 'g1', name: 'Rozmiar', minSelect: 1, maxSelect: 1, required: true, options: [
      { id: 'o1', name: '300 ml', priceDelta: 0 }, { id: 'o2', name: '500 ml', priceDelta: 700 },
    ] },
  ],
}

function Probe() {
  const { subtotal, count } = useCart()
  return <div><span data-testid="c">{count}</span><span data-testid="s">{subtotal}</span></div>
}

describe('OptionSheet', () => {
  it('requires a required group and adds a configured item at the right price', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    localStorage.clear()
    render(
      <NextIntlClientProvider locale="pl" messages={messages}>
        <CartProvider>
          <OptionSheet dish={dish} locale="pl" onClose={vi.fn()} />
          <Probe />
        </CartProvider>
      </NextIntlClientProvider>,
    )
    // Add disabled until the required group is chosen
    const addBtn = screen.getByRole('button', { name: /Dodaj/ })
    expect(addBtn).toBeDisabled()
    await user.click(screen.getByLabelText(/500 ml/))
    expect(addBtn).toBeEnabled()
    await user.click(addBtn)
    expect(screen.getByTestId('c').textContent).toBe('1')
    expect(screen.getByTestId('s').textContent).toBe('3500') // 2800 + 700
  })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run components/menu/__tests__/OptionSheet.test.tsx`
Expected: FAIL — cannot resolve `@/components/menu/OptionSheet`.

- [ ] **Step 4: Implement OptionSheet**

Create `components/menu/OptionSheet.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useCart } from '@/components/CartProvider'
import { dishPriceGrosze, formatZloty } from '@/lib/menu/price'
import type { LocalizedDish } from '@/lib/menu/types'
import type { SelectedOption } from '@/lib/cart/types'
import type { Locale } from '@/i18n/config'

export function OptionSheet({ dish, locale, onClose }: { dish: LocalizedDish; locale: Locale; onClose: () => void }) {
  const t = useTranslations('cart')
  const { addItem } = useCart()
  const [selected, setSelected] = useState<Record<string, Set<string>>>({})
  const [qty, setQty] = useState(1)

  function toggle(groupId: string, optionId: string, single: boolean) {
    setSelected((prev) => {
      const set = new Set(single ? [] : prev[groupId] ?? [])
      if (single) set.add(optionId)
      else set.has(optionId) ? set.delete(optionId) : set.add(optionId)
      return { ...prev, [groupId]: set }
    })
  }

  const chosen: SelectedOption[] = dish.optionGroups.flatMap((g) =>
    [...(selected[g.id] ?? [])].map((optId) => {
      const opt = g.options.find((o) => o.id === optId)!
      return { groupId: g.id, groupName: g.name, optionId: opt.id, optionName: opt.name, priceDelta: opt.priceDelta }
    }),
  )
  const requiredOk = dish.optionGroups.every((g) => !g.required || (selected[g.id]?.size ?? 0) >= g.minSelect)
  const unitPrice = dishPriceGrosze(dish.basePrice, chosen)

  function add() {
    addItem({ dishId: dish.id, name: dish.name, unitPrice, qty, selectedOptions: chosen })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-2xl bg-surface p-5 text-cream" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-lg">{dish.name}</h3>
        {dish.optionGroups.map((g) => (
          <fieldset key={g.id} className="mb-4">
            <legend className="mb-1 text-sm text-muted">
              {g.name}{g.required && <span className="ml-1 text-gold">· {t('required')}</span>}
            </legend>
            {g.options.map((o) => {
              const single = g.maxSelect === 1
              const isOn = selected[g.id]?.has(o.id) ?? false
              return (
                <label key={o.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="flex items-center gap-2">
                    <input type={single ? 'radio' : 'checkbox'} name={g.id} checked={isOn}
                      onChange={() => toggle(g.id, o.id, single)} />
                    {o.name}
                  </span>
                  {o.priceDelta > 0 && <span className="text-muted">+{formatZloty(o.priceDelta, locale)}</span>}
                </label>
              )
            })}
          </fieldset>
        ))}
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm text-muted">{t('qty')}</span>
          <button type="button" className="h-8 w-8 rounded-lg border border-line" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
          <span className="w-6 text-center">{qty}</span>
          <button type="button" className="h-8 w-8 rounded-lg border border-line" onClick={() => setQty((q) => q + 1)}>+</button>
        </div>
        <button type="button" disabled={!requiredOk} onClick={add}
          className="flex w-full items-center justify-between rounded-xl bg-gold px-4 py-3 font-bold text-espresso disabled:opacity-40">
          <span>{t('add')}</span><span>{formatZloty(unitPrice * qty, locale)}</span>
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run components/menu/__tests__/OptionSheet.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 6: Implement AddToCartButton + wire into DishCard**

Create `components/menu/AddToCartButton.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useCart } from '@/components/CartProvider'
import { Icon } from '@/components/Icon'
import { OptionSheet } from './OptionSheet'
import type { LocalizedDish } from '@/lib/menu/types'
import type { Locale } from '@/i18n/config'

export function AddToCartButton({ dish, locale }: { dish: LocalizedDish; locale: Locale }) {
  const { addItem } = useCart()
  const [open, setOpen] = useState(false)
  const hasOptions = dish.optionGroups.length > 0

  function onClick() {
    if (!dish.isAvailable) return
    if (hasOptions) setOpen(true)
    else addItem({ dishId: dish.id, name: dish.name, unitPrice: dish.basePrice, qty: 1, selectedOptions: [] })
  }

  return (
    <>
      <button type="button" aria-label={dish.name} disabled={!dish.isAvailable} onClick={onClick}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold text-espresso disabled:bg-surface disabled:text-muted">
        <Icon name="plus" size={15} />
      </button>
      {open && <OptionSheet dish={dish} locale={locale} onClose={() => setOpen(false)} />}
    </>
  )
}
```

In `components/menu/DishCard.tsx`, replace the existing inert `<button aria-label={dish.name} …><Icon name="plus" …/></button>` element with `<AddToCartButton dish={dish} locale={locale} />` and add `import { AddToCartButton } from './AddToCartButton'`. (DishCard stays a server component; AddToCartButton is the client island.)

**Update the existing DishCard test** (`components/menu/__tests__/DishCard.test.tsx`) — it now renders `AddToCartButton`, which calls `useCart()`, so it must be wrapped in `CartProvider` or it throws "useCart must be used within CartProvider". Two changes:
1. Wrap the rendered card in `CartProvider` inside the existing `NextIntlClientProvider` (add `import { CartProvider } from '@/components/CartProvider'`; update the `renderCard` helper to nest `<CartProvider>…</CartProvider>`). Add `beforeEach(() => localStorage.clear())`.
2. The add button's `aria-label` is now `dish.name` (not `add`). In the stop-listed assertion, change `screen.getByRole('button', { name: /add/i })` to `screen.getByRole('button', { name: 'Barszcz' })` (the fixture dish is named `Barszcz`).

- [ ] **Step 7: Run full suite + build**

Run: `npm test`
Expected: PASS (DishCard test updated for the new aria-label; all suites green).
Run: `npm run build` — passes.

- [ ] **Step 8: Commit**

```bash
git add components/menu messages/pl.json messages/uk.json messages/ru.json
git commit -m "feat: option picker + add-to-cart on dish cards"
```

---

### Task 8: Cart page

**Files:**
- Create: `app/[locale]/cart/page.tsx`, `components/cart/CartView.tsx`
- Modify: `components/SiteHeader.tsx` (cart badge shows live count + links to `/{locale}/cart`)
- Test: `components/cart/__tests__/CartView.test.tsx`

**Interfaces:**
- Consumes: `useCart`, `useSettings`, `formatZloty`, `meetsMinOrder`/`amountToFreeDelivery` (`@/lib/cart/totals`), `Icon`, `Link`, translations.
- Produces:
  - `CartView({ locale })` (client) — lists items (name, options summary, qty stepper, remove), shows subtotal, "amount to free delivery" hint, a min-order gate, and a "Checkout" link to `/{locale}/checkout` (disabled until min order met).
  - `SiteHeader` cart badge becomes a client island reading `useCart().count`.

- [ ] **Step 1: Write the failing test**

Create `components/cart/__tests__/CartView.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, it, expect, beforeEach } from 'vitest'
import { CartView } from '@/components/cart/CartView'
import { CartProvider, useCart } from '@/components/CartProvider'
import { SettingsProvider } from '@/components/SettingsProvider'
import type { Settings } from '@/lib/settings/types'
import type { CartItem } from '@/lib/cart/types'

const messages = { cart: { empty: 'Pusto', subtotal: 'Suma', toFree: 'do darmowej dostawy', checkout: 'Zamów', minOrder: 'Min. zamówienie', remove: 'Usuń' } }
const settings = { deliveryFee: 800, freeDeliveryThreshold: 6000, minOrder: 3000 } as Settings
const item: CartItem = { dishId: 'd1', name: 'Barszcz', unitPrice: 2800, qty: 1, selectedOptions: [] }

function Seed() { const { addItem } = useCart(); return <button onClick={() => addItem(item)}>seed</button> }

function wrap(ui: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="pl" messages={messages}>
      <SettingsProvider value={settings}><CartProvider>{ui}</CartProvider></SettingsProvider>
    </NextIntlClientProvider>
  )
}

describe('CartView', () => {
  beforeEach(() => localStorage.clear())

  it('blocks checkout below min order and enables it once met', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(wrap(<><Seed /><CartView locale="pl" /></>))
    await user.click(screen.getByText('seed')) // subtotal 2800 < 3000
    expect(screen.getByRole('link', { name: /Zamów/ })).toHaveAttribute('aria-disabled', 'true')
    await user.click(screen.getByText('seed')) // subtotal 5600 >= 3000
    expect(screen.getByRole('link', { name: /Zamów/ })).toHaveAttribute('aria-disabled', 'false')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run components/cart/__tests__/CartView.test.tsx`
Expected: FAIL — cannot resolve `@/components/cart/CartView`.

- [ ] **Step 3: Add `cart` message keys used by the view**

Extend the `cart` namespace in each `messages/*.json` with: `empty`, `subtotal`, `toFree`, `checkout`, `minOrder`, `remove`.
`pl`: `"empty":"Koszyk jest pusty","subtotal":"Suma","toFree":"do darmowej dostawy","checkout":"Zamów","minOrder":"Min. zamówienie","remove":"Usuń"`
`uk`: `"empty":"Кошик порожній","subtotal":"Сума","toFree":"до безкоштовної доставки","checkout":"Замовити","minOrder":"Мін. замовлення","remove":"Видалити"`
`ru`: `"empty":"Корзина пуста","subtotal":"Сумма","toFree":"до бесплатной доставки","checkout":"Заказать","minOrder":"Мин. заказ","remove":"Удалить"`

- [ ] **Step 4: Implement CartView**

Create `components/cart/CartView.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useCart } from '@/components/CartProvider'
import { useSettings } from '@/components/SettingsProvider'
import { formatZloty } from '@/lib/menu/price'
import { meetsMinOrder, amountToFreeDelivery } from '@/lib/cart/totals'
import { Icon } from '@/components/Icon'
import type { Locale } from '@/i18n/config'

export function CartView({ locale }: { locale: Locale }) {
  const t = useTranslations('cart')
  const settings = useSettings()
  const { items, subtotal, setQty, removeItem, keyOf } = useCart()

  if (items.length === 0) return <p className="p-8 text-center text-muted">{t('empty')}</p>

  const canCheckout = meetsMinOrder(subtotal, settings)
  const toFree = amountToFreeDelivery(subtotal, settings)

  return (
    <div className="mx-auto max-w-lg px-4 pb-28">
      {items.map((i) => {
        const key = keyOf(i)
        return (
          <div key={key} className="flex gap-3 border-b border-line py-3">
            <div className="flex-1">
              <h3 className="text-sm">{i.name}</h3>
              {i.selectedOptions.length > 0 && (
                <p className="text-xs text-muted">{i.selectedOptions.map((o) => o.optionName).join(', ')}</p>
              )}
              <div className="mt-1 flex items-center gap-3">
                <button aria-label="dec" className="h-7 w-7 rounded-lg border border-line" onClick={() => setQty(key, i.qty - 1)}>−</button>
                <span className="w-5 text-center text-sm">{i.qty}</span>
                <button aria-label="inc" className="h-7 w-7 rounded-lg border border-line" onClick={() => setQty(key, i.qty + 1)}>+</button>
                <button aria-label={t('remove')} className="ml-2 text-muted" onClick={() => removeItem(key)}><Icon name="receipt" size={14} /></button>
              </div>
            </div>
            <span className="text-sm font-bold text-gold">{formatZloty(i.unitPrice * i.qty, locale)}</span>
          </div>
        )
      })}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-muted">{t('subtotal')}</span>
        <span className="text-lg font-bold text-gold">{formatZloty(subtotal, locale)}</span>
      </div>
      {toFree > 0 && <p className="mt-1 text-xs text-muted">{formatZloty(toFree, locale)} {t('toFree')}</p>}
      {!canCheckout && <p className="mt-1 text-xs text-danger">{t('minOrder')}: {formatZloty(settings.minOrder, locale)}</p>}

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-lg p-4">
        <Link href={`/${locale}/checkout`} aria-disabled={!canCheckout}
          onClick={(e) => { if (!canCheckout) e.preventDefault() }}
          className={`flex items-center justify-center rounded-xl px-4 py-3 font-bold ${canCheckout ? 'bg-gold text-espresso' : 'bg-surface text-muted'}`}>
          {t('checkout')} · {formatZloty(subtotal, locale)}
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create the cart page + wire header badge**

Create `app/[locale]/cart/page.tsx`:

```tsx
import { setRequestLocale } from 'next-intl/server'
import { CartView } from '@/components/cart/CartView'
import { SiteHeader } from '@/components/SiteHeader'
import type { Locale } from '@/i18n/config'

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale as Locale)
  return (<><SiteHeader locale={locale as Locale} /><CartView locale={locale as Locale} /></>)
}
```

In `components/SiteHeader.tsx`, extract the cart badge into a small client island so it shows the live count. Create it inline as `components/cart/CartBadge.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { useCart } from '@/components/CartProvider'
import { Icon } from '@/components/Icon'
import type { Locale } from '@/i18n/config'

export function CartBadge({ locale }: { locale: Locale }) {
  const { count } = useCart()
  return (
    <Link href={`/${locale}/cart`} className="flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 font-bold text-espresso">
      <Icon name="cart" size={15} />{count}
    </Link>
  )
}
```

Then in `SiteHeader.tsx` replace the static `<span … cart badge …>` markup with `<CartBadge locale={locale} />` and add `import { CartBadge } from '@/components/cart/CartBadge'`.

- [ ] **Step 6: Run test + full suite + build**

Run: `npx vitest run components/cart/__tests__/CartView.test.tsx` → PASS.
Run: `npm test` → all green. Run: `npm run build` → passes.

- [ ] **Step 7: Commit**

```bash
git add app/[locale]/cart components/cart components/SiteHeader.tsx messages/pl.json messages/uk.json messages/ru.json
git commit -m "feat: cart page + live header badge + min-order gate"
```

---

### Task 9: Address input abstraction (manual fields)

**Files:**
- Create: `lib/address/types.ts`, `components/checkout/AddressFields.tsx`
- Test: `components/checkout/__tests__/AddressFields.test.tsx`

**Interfaces:**
- Consumes: translations (`checkout` namespace — added here), `Icon`.
- Produces:
  - `AddressValue` type (see Shared types).
  - `emptyAddress(): AddressValue`
  - `formatAddress(a: AddressValue): string` — human string from `street`/`building`/`apartment`.
  - `AddressFields({ value, onChange })` (client) — controlled inputs for street/building/apartment/floor/entrance/intercom; keeps `lat`/`lng` `null` and sets `formatted` via `formatAddress`. Phase 2b swaps this component for a map-backed one with the same props.

- [ ] **Step 1: Add the `checkout` message namespace (address labels)**

Add to each `messages/*.json` a `"checkout"` block (extended further in Task 10). For this task include: `street`, `building`, `apartment`, `floor`, `entrance`, `intercom`.
`pl`: `"checkout": { "street":"Ulica","building":"Nr budynku","apartment":"Mieszkanie","floor":"Piętro","entrance":"Klatka","intercom":"Domofon" }`
`uk`: `"checkout": { "street":"Вулиця","building":"Будинок","apartment":"Квартира","floor":"Поверх","entrance":"Під'їзд","intercom":"Домофон" }`
`ru`: `"checkout": { "street":"Улица","building":"Дом","apartment":"Квартира","floor":"Этаж","entrance":"Подъезд","intercom":"Домофон" }`

- [ ] **Step 2: Write the failing test**

Create `components/checkout/__tests__/AddressFields.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, it, expect, vi } from 'vitest'
import { AddressFields } from '@/components/checkout/AddressFields'
import { emptyAddress, formatAddress } from '@/lib/address/types'

const messages = { checkout: { street: 'Ulica', building: 'Nr', apartment: 'Mieszkanie', floor: 'Piętro', entrance: 'Klatka', intercom: 'Domofon' } }

describe('AddressFields', () => {
  it('emits updated value with a formatted string on edit', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <NextIntlClientProvider locale="pl" messages={messages}>
        <AddressFields value={emptyAddress()} onChange={onChange} />
      </NextIntlClientProvider>,
    )
    await user.type(screen.getByLabelText('Ulica'), 'Przykładowa')
    expect(onChange).toHaveBeenCalled()
    const last = onChange.mock.calls.at(-1)![0]
    expect(last.street).toContain('Przykładowa'.slice(-1)) // last keystroke applied
  })

  it('formatAddress joins street + building + apartment', () => {
    expect(formatAddress({ ...emptyAddress(), street: 'Przykładowa', building: '1', apartment: '5' }))
      .toBe('Przykładowa 1/5')
  })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run components/checkout/__tests__/AddressFields.test.tsx`
Expected: FAIL — cannot resolve modules.

- [ ] **Step 4: Implement types + component**

Create `lib/address/types.ts`:

```ts
export interface AddressValue {
  street: string; building: string; apartment: string
  floor: string; entrance: string; intercom: string
  lat: number | null; lng: number | null; formatted: string
}

export function emptyAddress(): AddressValue {
  return { street: '', building: '', apartment: '', floor: '', entrance: '', intercom: '', lat: null, lng: null, formatted: '' }
}

export function formatAddress(a: AddressValue): string {
  const base = [a.street, a.building].filter(Boolean).join(' ')
  return a.apartment ? `${base}/${a.apartment}` : base
}
```

Create `components/checkout/AddressFields.tsx`:

```tsx
'use client'
import { useTranslations } from 'next-intl'
import { type AddressValue, formatAddress } from '@/lib/address/types'

const FIELDS: (keyof AddressValue)[] = ['street', 'building', 'apartment', 'floor', 'entrance', 'intercom']

export function AddressFields({ value, onChange }: { value: AddressValue; onChange: (v: AddressValue) => void }) {
  const t = useTranslations('checkout')
  function set(field: keyof AddressValue, v: string) {
    const next = { ...value, [field]: v }
    next.formatted = formatAddress(next)
    onChange(next)
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {FIELDS.map((f) => (
        <label key={f} className={`text-xs text-muted ${f === 'street' ? 'col-span-2' : ''}`}>
          {t(f)}
          <input value={value[f] as string} onChange={(e) => set(f, e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-cream" />
        </label>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run components/checkout/__tests__/AddressFields.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/address components/checkout/AddressFields.tsx components/checkout/__tests__ messages/pl.json messages/uk.json messages/ru.json
git commit -m "feat: address input abstraction (manual fields)"
```

---

### Task 10: Order creation server action + revalidation

**Files:**
- Create: `lib/orders/revalidate.ts`, `lib/orders/token.ts`, `lib/orders/createOrder.ts`
- Test: `lib/orders/__tests__/revalidate.test.ts`

**Interfaces:**
- Consumes: `createAdminClient` (`@/lib/supabase/admin`), `dishPriceGrosze` (`@/lib/menu/price`), cart totals (`@/lib/cart/totals`), `isOpenNow` (`@/lib/hours/hours`), `SelectedOption`/`CartItem`, `AddressValue`.
- Produces:
  - `revalidateItems(cart: CartItem[], dbDishes, locale: Locale): { ok: true; items: PricedItem[] } | { ok: false; error: string }` — pure; recomputes name/price from DB rows, rejects unavailable dishes or unknown options. `PricedItem = { dishId; name; unitPrice; qty; selectedOptions; lineTotal }`.
  - `newToken(): string` — URL-safe random token.
  - `createOrder(input: CreateOrderInput): Promise<{ token: string } | { error: string }>` — server action ('use server'): loads dishes+options via admin client, revalidates, recomputes totals, checks min order + (open-now OR provided `scheduledFor`), upserts customer, inserts order + items, returns token. `CreateOrderInput = { locale; type; name; phone; address: AddressValue | null; scheduledFor: string | null; notes: string; cashChangeFrom: number | null; cart: CartItem[] }`.

- [ ] **Step 1: Write the failing revalidation tests**

Create `lib/orders/__tests__/revalidate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { revalidateItems } from '@/lib/orders/revalidate'
import type { CartItem } from '@/lib/cart/types'

const dbDishes = [
  { id: 'd1', name: { pl: 'Barszcz' }, base_price: 2800, is_available: true,
    option_groups: [{ id: 'g1', options: [{ id: 'o2', name: { pl: '500 ml' }, price_delta: 700 }] }] },
  { id: 'd3', name: { pl: 'Kotlet' }, base_price: 3200, is_available: false, option_groups: [] },
]

const good: CartItem = { dishId: 'd1', name: 'stale', unitPrice: 999, qty: 2,
  selectedOptions: [{ groupId: 'g1', groupName: 'x', optionId: 'o2', optionName: 'y', priceDelta: 111 }] }

describe('revalidateItems', () => {
  it('recomputes name + price from the DB (ignores client-sent values)', () => {
    const r = revalidateItems([good], dbDishes, 'pl')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.items[0].unitPrice).toBe(3500) // 2800 + 700 (server truth, not 999/111)
      expect(r.items[0].name).toBe('Barszcz')
      expect(r.items[0].lineTotal).toBe(7000)
    }
  })
  it('rejects a stop-listed dish', () => {
    const r = revalidateItems([{ ...good, dishId: 'd3', selectedOptions: [] }], dbDishes, 'pl')
    expect(r.ok).toBe(false)
  })
  it('rejects an unknown option id', () => {
    const bad: CartItem = { ...good, selectedOptions: [{ groupId: 'g1', groupName: 'x', optionId: 'nope', optionName: 'y', priceDelta: 0 }] }
    const r = revalidateItems([bad], dbDishes, 'pl')
    expect(r.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/orders/__tests__/revalidate.test.ts`
Expected: FAIL — cannot resolve `@/lib/orders/revalidate`.

- [ ] **Step 3: Implement revalidate + token**

Create `lib/orders/revalidate.ts`:

```ts
import { dishPriceGrosze } from '@/lib/menu/price'
import { localize } from '@/lib/localize'
import type { CartItem, SelectedOption } from '@/lib/cart/types'
import type { Locale } from '@/i18n/config'

export interface PricedItem {
  dishId: string; name: string; unitPrice: number; qty: number
  selectedOptions: SelectedOption[]; lineTotal: number
}

interface DbOption { id: string; name: Record<string, string>; price_delta: number }
interface DbGroup { id: string; options: DbOption[] }
interface DbDish { id: string; name: Record<string, string>; base_price: number; is_available: boolean; option_groups: DbGroup[] }

type Result = { ok: true; items: PricedItem[] } | { ok: false; error: string }

export function revalidateItems(cart: CartItem[], dbDishes: DbDish[], locale: Locale): Result {
  if (cart.length === 0) return { ok: false, error: 'empty_cart' }
  const byId = new Map(dbDishes.map((d) => [d.id, d]))
  const items: PricedItem[] = []

  for (const ci of cart) {
    if (ci.qty <= 0) return { ok: false, error: 'bad_qty' }
    const dish = byId.get(ci.dishId)
    if (!dish) return { ok: false, error: `unknown_dish:${ci.dishId}` }
    if (!dish.is_available) return { ok: false, error: `unavailable:${ci.dishId}` }

    const resolved: SelectedOption[] = []
    for (const so of ci.selectedOptions) {
      const group = dish.option_groups.find((g) => g.id === so.groupId)
      const opt = group?.options.find((o) => o.id === so.optionId)
      if (!group || !opt) return { ok: false, error: `unknown_option:${so.optionId}` }
      resolved.push({ groupId: group.id, groupName: so.groupName, optionId: opt.id, optionName: localize(opt.name, locale), priceDelta: opt.price_delta })
    }
    const unitPrice = dishPriceGrosze(dish.base_price, resolved)
    items.push({ dishId: dish.id, name: localize(dish.name, locale), unitPrice, qty: ci.qty, selectedOptions: resolved, lineTotal: unitPrice * ci.qty })
  }
  return { ok: true, items }
}
```

Create `lib/orders/token.ts`:

```ts
import { randomBytes } from 'node:crypto'

export function newToken(): string {
  return randomBytes(12).toString('base64url')
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/orders/__tests__/revalidate.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement the server action**

Create `lib/orders/createOrder.ts`:

```ts
'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidateItems } from './revalidate'
import { newToken } from './token'
import { cartSubtotal } from '@/lib/cart/totals'
import { deliveryFee, orderTotal, meetsMinOrder } from '@/lib/cart/totals'
import { isOpenNow } from '@/lib/hours/hours'
import type { CartItem } from '@/lib/cart/types'
import type { AddressValue } from '@/lib/address/types'
import type { Locale } from '@/i18n/config'

export interface CreateOrderInput {
  locale: Locale
  type: 'delivery' | 'pickup'
  name: string
  phone: string
  address: AddressValue | null
  scheduledFor: string | null   // 'YYYY-MM-DDTHH:MM' local wall-clock, or null = ASAP
  notes: string
  cashChangeFrom: number | null
  cart: CartItem[]
}

export async function createOrder(input: CreateOrderInput): Promise<{ token: string } | { error: string }> {
  const admin = createAdminClient()

  const dishIds = [...new Set(input.cart.map((i) => i.dishId))]
  const { data: dishes, error: dishErr } = await admin
    .from('dishes')
    .select('id, name, base_price, is_available, option_groups(id, options(id, name, price_delta))')
    .in('id', dishIds)
  if (dishErr) return { error: 'load_failed' }

  const rv = revalidateItems(input.cart, (dishes ?? []) as never, input.locale)
  if (!rv.ok) return { error: rv.error }

  const { data: settings } = await admin.from('restaurant_settings').select('*').single()
  if (!settings) return { error: 'no_settings' }

  const subtotal = cartSubtotal(rv.items.map((i) => ({ dishId: i.dishId, name: i.name, unitPrice: i.unitPrice, qty: i.qty, selectedOptions: i.selectedOptions })))
  if (!meetsMinOrder(subtotal, { minOrder: settings.min_order })) return { error: 'below_min_order' }

  const openNow = isOpenNow(settings.hours as never, new Date())
  if (!openNow && !input.scheduledFor) return { error: 'closed' }

  const fee = deliveryFee(subtotal, input.type, { deliveryFee: settings.delivery_fee, freeDeliveryThreshold: settings.free_delivery_threshold })
  const total = orderTotal(subtotal, fee)

  // upsert customer by phone
  const { data: customer } = await admin
    .from('customers')
    .upsert({ phone: input.phone, name: input.name }, { onConflict: 'phone' })
    .select('id')
    .single()

  const token = newToken()
  const { data: order, error: orderErr } = await admin
    .from('orders')
    .insert({
      public_token: token,
      customer_id: customer?.id ?? null,
      customer_name: input.name,
      customer_phone: input.phone,
      type: input.type,
      status: 'pending',
      payment_method: 'cash',
      cash_change_from: input.cashChangeFrom,
      subtotal, delivery_fee: fee, total,
      notes: input.notes || null,
      address_snapshot: input.type === 'delivery' ? input.address : null,
      scheduled_for: input.scheduledFor
        ? new Date(input.scheduledFor).toISOString() // interpreted below via SQL if needed; ISO is acceptable for MVP
        : null,
      language: input.locale,
    })
    .select('id')
    .single()
  if (orderErr || !order) return { error: 'create_failed' }

  const { error: itemsErr } = await admin.from('order_items').insert(
    rv.items.map((i) => ({
      order_id: order.id, dish_id: i.dishId, name: i.name,
      unit_price: i.unitPrice, qty: i.qty, selected_options: i.selectedOptions, line_total: i.lineTotal,
    })),
  )
  if (itemsErr) return { error: 'items_failed' }

  return { token }
}
```

> Note: `scheduledFor` is stored as an ISO instant derived from the local wall-clock string for this MVP. Precise DST-correct conversion via Postgres `AT TIME ZONE 'Europe/Warsaw'` is a Phase-2b refinement (it lands with the map/zone work); the slot values already come from `generateSlots`, which is Warsaw-correct, so the displayed time is right.

- [ ] **Step 6: Smoke-test the action against local Supabase**

Ensure Supabase is running. Add a temporary script or a throwaway route that calls `createOrder` with a pickup order for a seeded dish (`d1` equivalent id — look it up), confirm it returns a `{ token }` and a row appears:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select public_token, type, subtotal, total, status from orders order by created_at desc limit 1;"
```

Expected: one `pending` order with correct server-computed totals. Remove the throwaway route afterward (do not commit it).

- [ ] **Step 7: Full suite + build + commit**

Run: `npm test` → green. Run: `npm run build` → passes.

```bash
git add lib/orders
git commit -m "feat: createOrder server action with server-side revalidation"
```

---

### Task 11: Checkout page

**Files:**
- Create: `app/[locale]/checkout/page.tsx`, `components/checkout/CheckoutForm.tsx`, `components/checkout/TimeChooser.tsx`
- Modify: `messages/pl.json`, `messages/uk.json`, `messages/ru.json` (extend `checkout` namespace)
- Test: `components/checkout/__tests__/CheckoutForm.test.tsx`

**Interfaces:**
- Consumes: `useCart`, `useSettings`, `createOrder` (`@/lib/orders/createOrder`), `AddressFields`, `emptyAddress`/`AddressValue`, `deliveryFee`/`orderTotal`/`meetsMinOrder` (`@/lib/cart/totals`), `generateSlots` (`@/lib/hours/hours`), `isValidPlPhone` (`@/lib/phone/phone`), `formatZloty`, `useRouter`, translations.
- Produces:
  - `TimeChooser({ slots, value, onChange })` (client) — "ASAP" + a `<select>` of slot labels; `value` is `null` (ASAP) or a slot `value`.
  - `CheckoutForm({ locale })` (client) — the single-page form; on submit calls `createOrder` and `router.push('/{locale}/order/{token}')` on success, or shows the error.

- [ ] **Step 1: Extend the `checkout` message namespace**

Add to each `messages/*.json` `checkout` block: `delivery`, `pickup`, `name`, `phone`, `phoneInvalid`, `time`, `asap`, `notes`, `changeFrom`, `place`, `deliveryFee`, `total`, `closed`, `errorGeneric`, `emptyCart`.
`pl` values: `"delivery":"Dostawa","pickup":"Odbiór","name":"Imię","phone":"Telefon","phoneInvalid":"Nieprawidłowy numer","time":"Czas","asap":"Jak najszybciej","notes":"Uwagi","changeFrom":"Reszta z","place":"Zamawiam","deliveryFee":"Dostawa","total":"Razem","closed":"Zamknięte — wybierz czas","errorGeneric":"Coś poszło nie tak","emptyCart":"Koszyk jest pusty"`
`uk` values: `"delivery":"Доставка","pickup":"Самовивіз","name":"Ім'я","phone":"Телефон","phoneInvalid":"Невірний номер","time":"Час","asap":"Якнайшвидше","notes":"Коментар","changeFrom":"Решта з","place":"Замовити","deliveryFee":"Доставка","total":"Разом","closed":"Зачинено — оберіть час","errorGeneric":"Щось пішло не так","emptyCart":"Кошик порожній"`
`ru` values: `"delivery":"Доставка","pickup":"Самовывоз","name":"Имя","phone":"Телефон","phoneInvalid":"Неверный номер","time":"Время","asap":"Как можно скорее","notes":"Комментарий","changeFrom":"Сдача с","place":"Заказать","deliveryFee":"Доставка","total":"Итого","closed":"Закрыто — выберите время","errorGeneric":"Что-то пошло не так","emptyCart":"Корзина пуста"`

- [ ] **Step 2: Write the failing test**

Create `components/checkout/__tests__/CheckoutForm.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
const createOrder = vi.fn(async () => ({ token: 'tok123' }))
vi.mock('@/lib/orders/createOrder', () => ({ createOrder: (...a: unknown[]) => createOrder(...a) }))

import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import { CartProvider, useCart } from '@/components/CartProvider'
import { SettingsProvider } from '@/components/SettingsProvider'
import type { Settings } from '@/lib/settings/types'
import type { CartItem } from '@/lib/cart/types'

const messages = { checkout: { delivery:'Dostawa', pickup:'Odbiór', name:'Imię', phone:'Telefon', phoneInvalid:'zły', time:'Czas', asap:'ASAP', notes:'Uwagi', changeFrom:'Reszta', place:'Zamawiam', deliveryFee:'Dostawa', total:'Razem', closed:'Zamknięte', errorGeneric:'Błąd', emptyCart:'Pusto', street:'Ulica', building:'Nr', apartment:'M', floor:'P', entrance:'K', intercom:'D' } }
const settings = { deliveryFee: 800, freeDeliveryThreshold: 6000, minOrder: 3000, prepLeadMinutes: 40,
  hours: { mon:{open:'11:00',close:'22:00'}, tue:{open:'11:00',close:'22:00'}, wed:{open:'11:00',close:'22:00'}, thu:{open:'11:00',close:'22:00'}, fri:{open:'11:00',close:'22:00'}, sat:{open:'11:00',close:'22:00'}, sun:{open:'11:00',close:'22:00'} } } as Settings
const item: CartItem = { dishId: 'd1', name: 'Barszcz', unitPrice: 3500, qty: 1, selectedOptions: [] }

function Seed() { const { addItem } = useCart(); return <button onClick={() => addItem(item)}>seed</button> }
function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="pl" messages={messages}><SettingsProvider value={settings}><CartProvider>{ui}</CartProvider></SettingsProvider></NextIntlClientProvider>
}

describe('CheckoutForm', () => {
  beforeEach(() => { localStorage.clear(); push.mockClear(); createOrder.mockClear() })

  it('submits a pickup order and navigates to the order page', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(wrap(<><Seed /><CheckoutForm locale="pl" /></>))
    await user.click(screen.getByText('seed'))
    await user.click(screen.getByLabelText('Odbiór'))          // pickup: no address needed
    await user.type(screen.getByLabelText('Imię'), 'Jan')
    await user.type(screen.getByLabelText('Telefon'), '500100200')
    await user.click(screen.getByRole('button', { name: /Zamawiam/ }))
    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/pl/order/tok123'))
  })

  it('blocks submit on an invalid phone', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(wrap(<><Seed /><CheckoutForm locale="pl" /></>))
    await user.click(screen.getByText('seed'))
    await user.click(screen.getByLabelText('Odbiór'))
    await user.type(screen.getByLabelText('Imię'), 'Jan')
    await user.type(screen.getByLabelText('Telefon'), '123')
    await user.click(screen.getByRole('button', { name: /Zamawiam/ }))
    expect(createOrder).not.toHaveBeenCalled()
    expect(await screen.findByText('zły')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run components/checkout/__tests__/CheckoutForm.test.tsx`
Expected: FAIL — cannot resolve `@/components/checkout/CheckoutForm`.

- [ ] **Step 4: Implement TimeChooser**

Create `components/checkout/TimeChooser.tsx`:

```tsx
'use client'
import { useTranslations } from 'next-intl'

export function TimeChooser({
  slots, value, onChange,
}: { slots: { value: string; hhmm: string }[]; value: string | null; onChange: (v: string | null) => void }) {
  const t = useTranslations('checkout')
  return (
    <select aria-label={t('time')} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}
      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-cream">
      <option value="">{t('asap')}</option>
      {slots.map((s) => <option key={s.value} value={s.value}>{s.value.slice(5, 10)} {s.hhmm}</option>)}
    </select>
  )
}
```

- [ ] **Step 5: Implement CheckoutForm**

Create `components/checkout/CheckoutForm.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCart } from '@/components/CartProvider'
import { useSettings } from '@/components/SettingsProvider'
import { AddressFields } from './AddressFields'
import { TimeChooser } from './TimeChooser'
import { emptyAddress, type AddressValue } from '@/lib/address/types'
import { deliveryFee, orderTotal, meetsMinOrder } from '@/lib/cart/totals'
import { generateSlots } from '@/lib/hours/hours'
import { isValidPlPhone } from '@/lib/phone/phone'
import { formatZloty } from '@/lib/menu/price'
import { createOrder } from '@/lib/orders/createOrder'
import type { Locale } from '@/i18n/config'

export function CheckoutForm({ locale }: { locale: Locale }) {
  const t = useTranslations('checkout')
  const router = useRouter()
  const settings = useSettings()
  const { items, subtotal, clear } = useCart()

  const [type, setType] = useState<'delivery' | 'pickup'>('delivery')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState<AddressValue>(emptyAddress())
  const [scheduledFor, setScheduledFor] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [phoneErr, setPhoneErr] = useState(false)
  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (items.length === 0) return <p className="p-8 text-center text-muted">{t('emptyCart')}</p>

  const slots = generateSlots(settings.hours, settings.prepLeadMinutes, new Date(), 2)
    .map((s) => ({ value: s.value, hhmm: s.hhmm }))
  const fee = deliveryFee(subtotal, type, settings)
  const total = orderTotal(subtotal, fee)

  async function submit() {
    if (!isValidPlPhone(phone)) { setPhoneErr(true); return }
    setPhoneErr(false)
    if (!meetsMinOrder(subtotal, settings)) { setSubmitErr(t('errorGeneric')); return }
    setBusy(true)
    const res = await createOrder({
      locale, type, name, phone,
      address: type === 'delivery' ? address : null,
      scheduledFor, notes, cashChangeFrom: null, cart: items,
    })
    setBusy(false)
    if ('token' in res) { clear(); router.push(`/${locale}/order/${res.token}`) }
    else setSubmitErr(t('errorGeneric'))
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-8">
      <div className="my-4 flex gap-2">
        {(['delivery', 'pickup'] as const).map((v) => (
          <label key={v} className={`flex-1 rounded-lg border border-line py-2 text-center text-sm ${type === v ? 'bg-gold text-espresso' : 'text-muted'}`}>
            <input type="radio" name="type" className="sr-only" checked={type === v} onChange={() => setType(v)} />
            {t(v)}
          </label>
        ))}
      </div>

      <label className="block text-xs text-muted">{t('name')}
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-cream" />
      </label>
      <label className="mt-3 block text-xs text-muted">{t('phone')}
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-cream" />
      </label>
      {phoneErr && <p className="mt-1 text-xs text-danger">{t('phoneInvalid')}</p>}

      {type === 'delivery' && <div className="mt-4"><AddressFields value={address} onChange={setAddress} /></div>}

      <div className="mt-4">
        <span className="text-xs text-muted">{t('time')}</span>
        <div className="mt-1"><TimeChooser slots={slots} value={scheduledFor} onChange={setScheduledFor} /></div>
      </div>

      <label className="mt-3 block text-xs text-muted">{t('notes')}
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-cream" />
      </label>

      <div className="mt-4 space-y-1 text-sm">
        {type === 'delivery' && <div className="flex justify-between text-muted"><span>{t('deliveryFee')}</span><span>{formatZloty(fee, locale)}</span></div>}
        <div className="flex justify-between font-bold"><span>{t('total')}</span><span className="text-gold">{formatZloty(total, locale)}</span></div>
      </div>

      {submitErr && <p className="mt-2 text-sm text-danger">{submitErr}</p>}
      <button type="button" disabled={busy} onClick={submit} className="mt-4 w-full rounded-xl bg-gold px-4 py-3 font-bold text-espresso disabled:opacity-50">
        {t('place')}
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Create the checkout page**

Create `app/[locale]/checkout/page.tsx`:

```tsx
import { setRequestLocale } from 'next-intl/server'
import { SiteHeader } from '@/components/SiteHeader'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import type { Locale } from '@/i18n/config'

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale as Locale)
  return (<><SiteHeader locale={locale as Locale} /><CheckoutForm locale={locale as Locale} /></>)
}
```

- [ ] **Step 7: Run test + full suite + build**

Run: `npx vitest run components/checkout/__tests__/CheckoutForm.test.tsx` → PASS (2 tests).
Run: `npm test` → all green. Run: `npm run build` → passes.

- [ ] **Step 8: Commit**

```bash
git add app/[locale]/checkout components/checkout messages/pl.json messages/uk.json messages/ru.json
git commit -m "feat: single-page checkout (delivery/pickup, contact, address, time, submit)"
```

---

### Task 12: Order status page

**Files:**
- Create: `app/[locale]/order/[token]/page.tsx`, `lib/orders/getOrder.ts`
- Modify: `messages/pl.json`, `messages/uk.json`, `messages/ru.json` (add `order` namespace)

**Interfaces:**
- Consumes: `createAdminClient` (`@/lib/supabase/admin`), `formatZloty`, translations, `notFound`.
- Produces:
  - `getOrder(token: string)` (server) — reads the order + items by `public_token` via the admin client; returns `null` if not found.
  - `/[locale]/order/[token]` page — server-rendered order summary (status label, items, totals, type, time, contact). 404 on unknown token.

- [ ] **Step 1: Add the `order` message namespace**

Add to each `messages/*.json` an `"order"` block: `title`, status labels (`pending`,`confirmed`,`preparing`,`ready`,`out_for_delivery`,`delivered`,`picked_up`,`cancelled`,`rejected`), `subtotal`, `deliveryFee`, `total`, `type_delivery`, `type_pickup`, `asap`, `notFound`.
`pl` (example): `"order": { "title":"Twoje zamówienie","pending":"Czeka na potwierdzenie","confirmed":"Potwierdzone","preparing":"W przygotowaniu","ready":"Gotowe","out_for_delivery":"W drodze","delivered":"Dostarczone","picked_up":"Odebrane","cancelled":"Anulowane","rejected":"Odrzucone","subtotal":"Suma","deliveryFee":"Dostawa","total":"Razem","type_delivery":"Dostawa","type_pickup":"Odbiór","asap":"Jak najszybciej","notFound":"Nie znaleziono zamówienia" }`
Provide uk/ru equivalents with the same keys (translate the values).

- [ ] **Step 2: Implement getOrder**

Create `lib/orders/getOrder.ts`:

```ts
import { createAdminClient } from '@/lib/supabase/admin'

export async function getOrder(token: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('orders')
    .select('*, order_items(*)')
    .eq('public_token', token)
    .single()
  if (error || !data) return null
  return data
}
```

- [ ] **Step 3: Implement the order page**

Create `app/[locale]/order/[token]/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { getOrder } from '@/lib/orders/getOrder'
import { formatZloty } from '@/lib/menu/price'
import { SiteHeader } from '@/components/SiteHeader'
import type { Locale } from '@/i18n/config'

export default async function OrderPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params
  setRequestLocale(locale as Locale)
  const order = await getOrder(token)
  if (!order) notFound()
  const t = await getTranslations('order')
  const loc = locale as Locale

  return (
    <>
      <SiteHeader locale={loc} />
      <main className="mx-auto max-w-lg px-4 py-6">
        <h1 className="text-2xl">{t('title')}</h1>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm text-gold">
          <span className="h-2 w-2 rounded-full bg-gold" />{t(order.status)}
        </div>

        <div className="mt-5 divide-y divide-line">
          {order.order_items.map((i: { id: string; name: string; qty: number; line_total: number; selected_options: { optionName: string }[] }) => (
            <div key={i.id} className="flex justify-between py-2 text-sm">
              <span>{i.qty}× {i.name}{i.selected_options.length > 0 && <span className="text-muted"> · {i.selected_options.map((o) => o.optionName).join(', ')}</span>}</span>
              <span className="text-gold">{formatZloty(i.line_total, loc)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between text-muted"><span>{t('subtotal')}</span><span>{formatZloty(order.subtotal, loc)}</span></div>
          {order.type === 'delivery' && <div className="flex justify-between text-muted"><span>{t('deliveryFee')}</span><span>{formatZloty(order.delivery_fee, loc)}</span></div>}
          <div className="flex justify-between font-bold"><span>{t('total')}</span><span className="text-gold">{formatZloty(order.total, loc)}</span></div>
        </div>

        <p className="mt-4 text-sm text-muted">{order.type === 'delivery' ? t('type_delivery') : t('type_pickup')} · {order.customer_name} · {order.customer_phone}</p>
      </main>
    </>
  )
}
```

- [ ] **Step 4: Verify end-to-end + build**

Run `npm run dev` with Supabase running. Place an order via `/pl/checkout` (pickup, seeded dish) → you should land on `/pl/order/<token>` showing the `pending` status, items, and totals. Visit a bogus token → 404. Stop the dev server.

Run: `npm test` → green. Run: `npm run build` → passes.

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/order lib/orders/getOrder.ts messages/pl.json messages/uk.json messages/ru.json
git commit -m "feat: order status page (read by public token)"
```

---

## Definition of Done

- `npm test` and `npm run build` pass.
- A guest can: configure a dish with options → add to cart → view `/cart` (with min-order gate + free-delivery hint) → check out on one page (delivery/pickup, contact, manual address, time = ASAP or a valid slot) → the order is created `pending` with **server-recomputed** totals → land on `/order/[token]`.
- The server action rejects stop-listed dishes, tampered prices, below-min-order, and closed-with-no-slot.
- Order/customer tables are private (RLS on, no public policies); only the service-role client touches them; `restaurant_settings` is public-read.
- All new copy is localized (pl/uk/ru); no emoji; grosze end-to-end.
- `AddressFields` is a drop-in behind the `AddressValue` interface — Phase 2b replaces it with the map/geocoding component without touching the cart, checkout flow, or server action.
