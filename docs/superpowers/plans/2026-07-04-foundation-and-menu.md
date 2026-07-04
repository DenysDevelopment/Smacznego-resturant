# Foundation + Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Smacznego project (Next.js + Supabase) and ship a multilingual, browsable menu in the "dark gourmet" design — the foundation every later phase builds on.

**Architecture:** One Next.js App Router app (TypeScript). Supabase provides Postgres for the menu. Menu text is stored as JSONB per-language (`{pl, uk, ru}`) and localized at render time with a pl-fallback. All money is stored as integer grosze. Pure domain logic (localization, price math, row→domain transforms) lives in framework-free modules that are unit-tested with Vitest; Supabase fetches are thin wrappers around those pure functions.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, next-intl v3, @supabase/supabase-js v2 + @supabase/ssr, Supabase CLI (local Postgres + migrations), Vitest + @testing-library/react.

**Scope note:** This plan seeds the menu via SQL rather than building an admin CRUD UI. The **menu-management admin** (staff-facing editor for dishes/prices/stop-list) is a deliberately separate plan — it needs staff auth, which arrives with the kitchen board (Ф3). Cart/checkout wiring for the add buttons lands in the checkout plan (Ф2). Combos have a schema and can be seeded, but their browsing UI is deferred with the rest of the menu-management work.

## Global Constraints

- **Money:** integer **grosze** everywhere (e.g. 28.00 zł → `2800`). Never floats for money.
- **Locales:** supported = `['pl','uk','ru']`; default/fallback = `'pl'`.
- **Timezone:** `Europe/Warsaw` for any date/time formatting.
- **Icons:** **SVG icons only — no emoji anywhere in the UI.** Food is shown via real photos (or photo-like placeholders until assets exist).
- **Supabase region:** EU (Frankfurt) when the cloud project is created (local dev uses the Supabase CLI).
- **Design tokens (dark gourmet):** bg `#14100d` / surface `#1c1611`, gold `#e0a44a`, cream `#f6ecdd`, muted `#b39d84`, success `#59d17d`, danger `#e5484d`. Display serif for headings, Inter for body.

---

### Task 1: Scaffold Next.js + Tailwind + Vitest

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Create: `vitest.config.ts`, `vitest.setup.ts`, `lib/__tests__/sanity.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a runnable Next.js app and a working `npm test` (Vitest) command that later tasks extend.

- [ ] **Step 1: Create the app**

Run in the project root (`/Users/denysmaksymuck/dev/SmacznegoDelivery`):

```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm
```

Accept defaults if prompted. This creates `app/`, `package.json`, `tsconfig.json`, `next.config.ts`, and Tailwind wiring.

- [ ] **Step 2: Add Vitest and testing libraries**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
})
```

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

Add scripts to `package.json` (merge into the existing `"scripts"` block):

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write a sanity test**

Create `lib/__tests__/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('sanity', () => {
  it('runs the test toolchain', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Run the test and the dev server**

Run: `npm test`
Expected: `1 passed`.

Run: `npm run dev` and open `http://localhost:3000` — the default Next.js page renders. Stop the server.

- [ ] **Step 6: Commit**

```bash
git init
printf "node_modules/\n.next/\n.env*.local\n.superpowers/\nsupabase/.branches/\nsupabase/.temp/\n" >> .gitignore
git add -A
git commit -m "chore: scaffold Next.js + Tailwind + Vitest"
```

---

### Task 2: Design tokens, fonts, and base theme

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Create: `lib/fonts.ts`

**Interfaces:**
- Consumes: the scaffolded app from Task 1.
- Produces: Tailwind v4 `@theme` colors — `espresso`, `surface`, `gold`, `cream`, `muted`, `success`, `danger`, `line` (usable as `bg-espresso`, `text-gold`, `border-line`, …) — plus font vars `--font-serif` (headings) and `--font-sans` (body) applied via `<html>`.

- [ ] **Step 1: Wire fonts**

Create `lib/fonts.ts`:

```ts
import { Playfair_Display, Inter } from 'next/font/google'

// Playfair Display supports latin, latin-ext AND cyrillic — required for uk/ru
// headings. (Fraunces has no cyrillic subset and would fail the build.)
export const serif = Playfair_Display({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-serif',
  display: 'swap',
})

export const sans = Inter({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap',
})
```

- [ ] **Step 2: Define tokens in globals.css**

Replace the contents of `app/globals.css` with:

```css
@import "tailwindcss";

@theme {
  --color-espresso: #14100d;
  --color-surface: #1c1611;
  --color-gold: #e0a44a;
  --color-cream: #f6ecdd;
  --color-muted: #b39d84;
  --color-success: #59d17d;
  --color-danger: #e5484d;
  --color-line: rgba(224, 164, 74, 0.18);
}

body {
  background: var(--color-espresso);
  color: var(--color-cream);
  font-family: var(--font-sans), system-ui, sans-serif;
}

h1, h2, h3 {
  font-family: var(--font-serif), Georgia, serif;
}
```

- [ ] **Step 3: Apply fonts in the root layout**

Replace `app/layout.tsx` with:

```tsx
import type { Metadata } from 'next'
import { serif, sans } from '@/lib/fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'Smacznego',
  description: 'Domowa kuchnia z dostawą',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 4: Verify the theme renders**

Temporarily replace `app/page.tsx` body with `<main className="p-10"><h1 className="text-4xl text-gold">Smacznego</h1></main>`, run `npm run dev`, and confirm a dark background with gold serif heading. Revert the temporary change afterward.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css app/layout.tsx lib/fonts.ts
git commit -m "feat: dark-gourmet design tokens and fonts"
```

---

### Task 3: SVG icon set (no emoji)

**Files:**
- Create: `components/Icon.tsx`
- Test: `components/__tests__/Icon.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `<Icon name="cart" | "search" | "clock" | "truck" | "gift" | "receipt" | "globe" | "chevron" | "plus" className? size? />` — an inline SVG component. Every icon in the app comes from here; no emoji is ever used.

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/Icon.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Icon } from '@/components/Icon'

describe('Icon', () => {
  it('renders an svg for a known name', () => {
    const { container } = render(<Icon name="cart" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('applies a custom size', () => {
    const { container } = render(<Icon name="plus" size={24} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '24')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/Icon.test.tsx`
Expected: FAIL — cannot resolve `@/components/Icon`.

- [ ] **Step 3: Implement the Icon component**

Create `components/Icon.tsx`:

```tsx
const PATHS: Record<string, React.ReactNode> = {
  cart: (<><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.2 12h11l2-8H6" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  truck: (<><path d="M2 6h11v9H2zM13 9h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></>),
  gift: (<><path d="M3 11h18v9H3zM3 7h18v4H3zM12 7v13M12 7S10 3 7.5 4 9 7 12 7zM12 7s2-4 4.5-3S15 7 12 7z" /></>),
  receipt: (<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" /></>),
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>),
  chevron: (<path d="M6 9l6 6 6-6" />),
  plus: (<path d="M12 5v14M5 12h14" />),
}

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name]}
    </svg>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/__tests__/Icon.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/Icon.tsx components/__tests__/Icon.test.tsx
git commit -m "feat: SVG icon set (no emoji)"
```

---

### Task 4: i18n with next-intl + `localize()` helper

**Files:**
- Create: `i18n/config.ts`, `i18n/request.ts`, `middleware.ts`
- Create: `messages/pl.json`, `messages/uk.json`, `messages/ru.json`
- Create: `lib/localize.ts`
- Test: `lib/__tests__/localize.test.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: the app from Task 1.
- Produces:
  - `LOCALES = ['pl','uk','ru'] as const`, `DEFAULT_LOCALE = 'pl'`, `type Locale`.
  - `localize(field: Partial<Record<Locale, string>> | null | undefined, locale: Locale): string` — returns the value for `locale`, falling back to `'pl'`, then to `''`.
  - Locale-prefixed routing (`/pl`, `/uk`, `/ru`) via next-intl middleware.

- [ ] **Step 1: Install next-intl**

```bash
npm install next-intl
```

- [ ] **Step 2: Write the failing test for `localize`**

Create `lib/__tests__/localize.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { localize } from '@/lib/localize'

describe('localize', () => {
  const field = { pl: 'Barszcz', uk: 'Борщ', ru: 'Борщ' }

  it('returns the requested locale', () => {
    expect(localize(field, 'uk')).toBe('Борщ')
  })

  it('falls back to pl when the locale is missing', () => {
    expect(localize({ pl: 'Barszcz' }, 'uk')).toBe('Barszcz')
  })

  it('returns empty string for null field', () => {
    expect(localize(null, 'ru')).toBe('')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/localize.test.ts`
Expected: FAIL — cannot resolve `@/lib/localize`.

- [ ] **Step 4: Implement config and `localize`**

Create `i18n/config.ts`:

```ts
export const LOCALES = ['pl', 'uk', 'ru'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'pl'
```

Create `lib/localize.ts`:

```ts
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config'

export function localize(
  field: Partial<Record<Locale, string>> | null | undefined,
  locale: Locale,
): string {
  if (!field) return ''
  return field[locale] ?? field[DEFAULT_LOCALE] ?? ''
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/localize.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Wire next-intl routing**

Create `i18n/request.ts`:

```ts
import { getRequestConfig } from 'next-intl/server'
import { LOCALES, DEFAULT_LOCALE, type Locale } from './config'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale: Locale = (LOCALES as readonly string[]).includes(requested ?? '')
    ? (requested as Locale)
    : DEFAULT_LOCALE
  return { locale, messages: (await import(`../messages/${locale}.json`)).default }
})
```

Create `middleware.ts`:

```ts
import createMiddleware from 'next-intl/middleware'
import { LOCALES, DEFAULT_LOCALE } from './i18n/config'

export default createMiddleware({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
```

Update `next.config.ts` to wrap with the next-intl plugin:

```ts
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {}

export default withNextIntl(nextConfig)
```

Create `messages/pl.json`:

```json
{
  "nav": { "menu": "Menu", "about": "O nas", "delivery": "Dostawa", "contact": "Kontakt" },
  "menu": { "search": "Znajdź danie…", "soldOut": "Brak w sprzedaży", "from": "od" }
}
```

Create `messages/uk.json`:

```json
{
  "nav": { "menu": "Меню", "about": "Про нас", "delivery": "Доставка", "contact": "Контакти" },
  "menu": { "search": "Знайти страву…", "soldOut": "Немає в наявності", "from": "від" }
}
```

Create `messages/ru.json`:

```json
{
  "nav": { "menu": "Меню", "about": "О нас", "delivery": "Доставка", "contact": "Контакты" },
  "menu": { "search": "Найти блюдо…", "soldOut": "Нет в наличии", "from": "от" }
}
```

- [ ] **Step 7: Move pages under `app/[locale]/`**

Create `app/[locale]/layout.tsx`:

```tsx
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { LOCALES, type Locale } from '@/i18n/config'

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!(LOCALES as readonly string[]).includes(locale)) notFound()
  setRequestLocale(locale as Locale)
  const messages = await getMessages()
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
}
```

Move `app/page.tsx` to `app/[locale]/page.tsx`. Remove the now-empty root `app/page.tsx`. Keep `app/layout.tsx` (html/body/fonts) as the outer layout.

- [ ] **Step 8: Verify routing**

Run `npm run dev`, open `http://localhost:3000/pl`, `http://localhost:3000/uk`, `http://localhost:3000/ru` — each loads; `http://localhost:3000/` redirects to `/pl`. Run `npm test` — all tests pass.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: next-intl routing (pl/uk/ru) and localize() helper"
```

---

### Task 5: Supabase local dev + client

**Files:**
- Create: `supabase/config.toml` (generated), `lib/supabase/server.ts`, `lib/supabase/types.ts`
- Create: `.env.local` (not committed), `.env.example`

**Interfaces:**
- Consumes: nothing new.
- Produces: `createClient()` returning a typed Supabase server client, reading `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Local Postgres available via the Supabase CLI.

- [ ] **Step 1: Install deps and init Supabase**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D supabase
npx supabase init
npx supabase start
```

`supabase start` prints the local `API URL` and `anon key`. Keep that output for the next step. (Requires Docker running.)

- [ ] **Step 2: Add env files**

Create `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Create `.env.local` with the values printed by `supabase start`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
```

- [ ] **Step 3: Create a placeholder types file**

Create `lib/supabase/types.ts`:

```ts
// Regenerate after migrations with:
//   npx supabase gen types typescript --local > lib/supabase/types.ts
export type Database = Record<string, never>
```

- [ ] **Step 4: Create the server client**

Create `lib/supabase/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (all) => {
          try {
            all.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // called from a Server Component — safe to ignore
          }
        },
      },
    },
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add supabase/config.toml lib/supabase/ .env.example
git commit -m "chore: supabase local dev + server client"
```

---

### Task 6: Menu database schema + seed

**Files:**
- Create: `supabase/migrations/0001_menu.sql`
- Create: `supabase/seed.sql`
- Modify: `lib/supabase/types.ts` (regenerated)

**Interfaces:**
- Consumes: local Supabase from Task 5.
- Produces: tables `categories`, `dishes`, `option_groups`, `options`, `combos`, `combo_items` with i18n JSONB name/description columns and integer-grosze prices; public read access via RLS; a regenerated `Database` type.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0001_menu.sql`:

```sql
create extension if not exists "pgcrypto";

create table categories (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,           -- {"pl":"…","uk":"…","ru":"…"}
  sort int not null default 0,
  is_visible boolean not null default true
);

create table dishes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  base_price int not null,        -- grosze
  photo_url text,
  is_available boolean not null default true,  -- stop-list
  tags text[] not null default '{}',
  sort int not null default 0
);

create table option_groups (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references dishes(id) on delete cascade,
  name jsonb not null,
  min_select int not null default 0,
  max_select int not null default 1,
  required boolean not null default false,
  sort int not null default 0
);

create table options (
  id uuid primary key default gen_random_uuid(),
  option_group_id uuid not null references option_groups(id) on delete cascade,
  name jsonb not null,
  price_delta int not null default 0,  -- grosze
  sort int not null default 0
);

create table combos (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  price int not null,             -- grosze
  photo_url text,
  is_available boolean not null default true,
  sort int not null default 0
);

create table combo_items (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references combos(id) on delete cascade,
  dish_id uuid references dishes(id) on delete set null,
  qty int not null default 1
);

-- Public read-only access to the menu.
alter table categories enable row level security;
alter table dishes enable row level security;
alter table option_groups enable row level security;
alter table options enable row level security;
alter table combos enable row level security;
alter table combo_items enable row level security;

create policy "public read" on categories for select using (true);
create policy "public read" on dishes for select using (true);
create policy "public read" on option_groups for select using (true);
create policy "public read" on options for select using (true);
create policy "public read" on combos for select using (true);
create policy "public read" on combo_items for select using (true);
```

- [ ] **Step 2: Write the seed**

Create `supabase/seed.sql`:

```sql
with cat as (
  insert into categories (name, sort) values
    ('{"pl":"Zupy","uk":"Супи","ru":"Супы"}', 1),
    ('{"pl":"Pierogi","uk":"Вареники","ru":"Вареники"}', 2)
  returning id, sort
)
insert into dishes (category_id, name, description, base_price, is_available, sort)
select
  (select id from cat where sort = 1),
  '{"pl":"Barszcz ukraiński","uk":"Борщ український","ru":"Борщ украинский"}',
  '{"pl":"Z pampuszkami","uk":"З пампушками","ru":"С пампушками"}',
  2800, true, 1
union all
select
  (select id from cat where sort = 2),
  '{"pl":"Pierogi z ziemniakami","uk":"Вареники з картоплею","ru":"Вареники с картошкой"}',
  '{"pl":"12 szt.","uk":"12 шт.","ru":"12 шт."}',
  2400, true, 1
union all
select
  (select id from cat where sort = 1),
  '{"pl":"Kotlet po kijowsku","uk":"Котлета по-київськи","ru":"Котлета по-киевски"}',
  '{}', 3200, false, 2;  -- stop-list example

-- Size options on the borscht
with d as (select id from dishes where name->>'pl' = 'Barszcz ukraiński' limit 1),
     g as (
       insert into option_groups (dish_id, name, min_select, max_select, required, sort)
       select id, '{"pl":"Rozmiar","uk":"Розмір","ru":"Размер"}', 1, 1, true, 1 from d
       returning id
     )
insert into options (option_group_id, name, price_delta, sort)
select id, '{"pl":"300 ml","uk":"300 мл","ru":"300 мл"}', 0, 1 from g
union all
select id, '{"pl":"500 ml","uk":"500 мл","ru":"500 мл"}', 700, 2 from g;
```

- [ ] **Step 3: Apply migration + seed**

```bash
npx supabase db reset
```

Expected: runs `0001_menu.sql` then `seed.sql` with no errors.

- [ ] **Step 4: Regenerate types**

```bash
npx supabase gen types typescript --local > lib/supabase/types.ts
```

Expected: `lib/supabase/types.ts` now exports a `Database` type containing the six tables.

- [ ] **Step 5: Verify the data**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select name->>'pl' as name, base_price, is_available from dishes order by base_price;"
```

Expected: three rows including `Kotlet po kijowsku` with `is_available = false`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations supabase/seed.sql lib/supabase/types.ts
git commit -m "feat: menu schema (i18n jsonb, grosze) + seed"
```

---

### Task 7: Menu domain model — transform + price math

**Files:**
- Create: `lib/menu/types.ts`
- Create: `lib/menu/transform.ts`
- Create: `lib/menu/price.ts`
- Test: `lib/menu/__tests__/transform.test.ts`
- Test: `lib/menu/__tests__/price.test.ts`

**Interfaces:**
- Consumes: `localize` (Task 4), `Locale` (Task 4).
- Produces:
  - Types `LocalizedDish`, `LocalizedCategory`, `LocalizedOptionGroup`, `LocalizedOption`, `MenuRow` (raw shapes).
  - `toLocalizedCategories(rows: MenuRow, locale: Locale): LocalizedCategory[]` — joins raw category/dish/option rows into a localized, sorted tree; **excludes categories with `is_visible = false`** but **keeps stop-listed dishes** (marking `isAvailable`).
  - `dishPriceGrosze(basePrice: number, selected: { priceDelta: number }[]): number` — base + sum of deltas.
  - `formatZloty(grosze: number, locale: Locale): string` — e.g. `2800 → "28,00 zł"`.

- [ ] **Step 1: Write the failing price tests**

Create `lib/menu/__tests__/price.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { dishPriceGrosze, formatZloty } from '@/lib/menu/price'

describe('dishPriceGrosze', () => {
  it('adds option deltas to the base price', () => {
    expect(dishPriceGrosze(2800, [{ priceDelta: 700 }, { priceDelta: 0 }])).toBe(3500)
  })
  it('returns the base price with no options', () => {
    expect(dishPriceGrosze(2400, [])).toBe(2400)
  })
})

describe('formatZloty', () => {
  it('formats grosze as zloty', () => {
    const s = formatZloty(2800, 'pl')
    expect(s).toContain('28,00')
    expect(s).toContain('zł')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/menu/__tests__/price.test.ts`
Expected: FAIL — cannot resolve `@/lib/menu/price`.

- [ ] **Step 3: Implement price math**

Create `lib/menu/price.ts`:

```ts
import type { Locale } from '@/i18n/config'

export function dishPriceGrosze(basePrice: number, selected: { priceDelta: number }[]): number {
  return selected.reduce((sum, o) => sum + o.priceDelta, basePrice)
}

export function formatZloty(grosze: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
  }).format(grosze / 100)
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/menu/__tests__/price.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing transform test**

Create `lib/menu/types.ts`:

```ts
import type { Locale } from '@/i18n/config'

type I18n = Partial<Record<Locale, string>>

export interface MenuRow {
  categories: { id: string; name: I18n; sort: number; is_visible: boolean }[]
  dishes: {
    id: string; category_id: string; name: I18n; description: I18n
    base_price: number; photo_url: string | null; is_available: boolean
    tags: string[]; sort: number
  }[]
  option_groups: { id: string; dish_id: string; name: I18n; min_select: number; max_select: number; required: boolean; sort: number }[]
  options: { id: string; option_group_id: string; name: I18n; price_delta: number; sort: number }[]
}

export interface LocalizedOption { id: string; name: string; priceDelta: number }
export interface LocalizedOptionGroup { id: string; name: string; minSelect: number; maxSelect: number; required: boolean; options: LocalizedOption[] }
export interface LocalizedDish { id: string; name: string; description: string; basePrice: number; photoUrl: string | null; isAvailable: boolean; tags: string[]; optionGroups: LocalizedOptionGroup[] }
export interface LocalizedCategory { id: string; name: string; dishes: LocalizedDish[] }
```

Create `lib/menu/__tests__/transform.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { toLocalizedCategories } from '@/lib/menu/transform'
import type { MenuRow } from '@/lib/menu/types'

const rows: MenuRow = {
  categories: [
    { id: 'c1', name: { pl: 'Zupy', ru: 'Супы' }, sort: 1, is_visible: true },
    { id: 'c2', name: { pl: 'Ukryte' }, sort: 2, is_visible: false },
  ],
  dishes: [
    { id: 'd1', category_id: 'c1', name: { pl: 'Barszcz', ru: 'Борщ' }, description: {}, base_price: 2800, photo_url: null, is_available: true, tags: [], sort: 2 },
    { id: 'd2', category_id: 'c1', name: { pl: 'Rosół' }, description: {}, base_price: 2000, photo_url: null, is_available: false, tags: [], sort: 1 },
  ],
  option_groups: [
    { id: 'g1', dish_id: 'd1', name: { pl: 'Rozmiar' }, min_select: 1, max_select: 1, required: true, sort: 1 },
  ],
  options: [
    { id: 'o1', option_group_id: 'g1', name: { pl: '500 ml' }, price_delta: 700, sort: 1 },
  ],
}

describe('toLocalizedCategories', () => {
  it('drops invisible categories', () => {
    const result = toLocalizedCategories(rows, 'ru')
    expect(result.map((c) => c.id)).toEqual(['c1'])
  })
  it('localizes with fallback and sorts dishes by sort', () => {
    const [cat] = toLocalizedCategories(rows, 'ru')
    expect(cat.name).toBe('Супы')
    expect(cat.dishes.map((d) => d.name)).toEqual(['Rosół', 'Борщ']) // d2 sort 1 before d1 sort 2; d2 pl-fallback
  })
  it('keeps stop-listed dishes but flags them', () => {
    const [cat] = toLocalizedCategories(rows, 'ru')
    const rosol = cat.dishes.find((d) => d.id === 'd2')!
    expect(rosol.isAvailable).toBe(false)
  })
  it('nests option groups and options', () => {
    const [cat] = toLocalizedCategories(rows, 'ru')
    const barszcz = cat.dishes.find((d) => d.id === 'd1')!
    expect(barszcz.optionGroups[0].options[0].priceDelta).toBe(700)
  })
})
```

- [ ] **Step 6: Run to verify failure**

Run: `npx vitest run lib/menu/__tests__/transform.test.ts`
Expected: FAIL — cannot resolve `@/lib/menu/transform`.

- [ ] **Step 7: Implement the transform**

Create `lib/menu/transform.ts`:

```ts
import { localize } from '@/lib/localize'
import type { Locale } from '@/i18n/config'
import type { LocalizedCategory, MenuRow } from './types'

export function toLocalizedCategories(rows: MenuRow, locale: Locale): LocalizedCategory[] {
  const optionsByGroup = new Map<string, MenuRow['options']>()
  for (const o of rows.options) {
    const list = optionsByGroup.get(o.option_group_id) ?? []
    list.push(o)
    optionsByGroup.set(o.option_group_id, list)
  }

  const groupsByDish = new Map<string, MenuRow['option_groups']>()
  for (const g of rows.option_groups) {
    const list = groupsByDish.get(g.dish_id) ?? []
    list.push(g)
    groupsByDish.set(g.dish_id, list)
  }

  const dishesByCategory = new Map<string, MenuRow['dishes']>()
  for (const d of rows.dishes) {
    const list = dishesByCategory.get(d.category_id) ?? []
    list.push(d)
    dishesByCategory.set(d.category_id, list)
  }

  const bySort = <T extends { sort: number }>(a: T, b: T) => a.sort - b.sort

  return rows.categories
    .filter((c) => c.is_visible)
    .sort(bySort)
    .map((c) => ({
      id: c.id,
      name: localize(c.name, locale),
      dishes: (dishesByCategory.get(c.id) ?? [])
        .slice()
        .sort(bySort)
        .map((d) => ({
          id: d.id,
          name: localize(d.name, locale),
          description: localize(d.description, locale),
          basePrice: d.base_price,
          photoUrl: d.photo_url,
          isAvailable: d.is_available,
          tags: d.tags,
          optionGroups: (groupsByDish.get(d.id) ?? [])
            .slice()
            .sort(bySort)
            .map((g) => ({
              id: g.id,
              name: localize(g.name, locale),
              minSelect: g.min_select,
              maxSelect: g.max_select,
              required: g.required,
              options: (optionsByGroup.get(g.id) ?? [])
                .slice()
                .sort(bySort)
                .map((o) => ({ id: o.id, name: localize(o.name, locale), priceDelta: o.price_delta })),
            })),
        })),
    }))
}
```

- [ ] **Step 8: Run to verify pass**

Run: `npx vitest run lib/menu/__tests__/transform.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 9: Commit**

```bash
git add lib/menu
git commit -m "feat: menu domain transform + price math (tested)"
```

---

### Task 8: Menu data access (Supabase fetch)

**Files:**
- Create: `lib/menu/getMenu.ts`

**Interfaces:**
- Consumes: `createClient` (Task 5), `toLocalizedCategories` (Task 7), `Locale` (Task 4).
- Produces: `getMenu(locale: Locale): Promise<LocalizedCategory[]>` — fetches all menu tables and returns the localized tree. Thin wrapper: all logic already lives in the tested transform.

- [ ] **Step 1: Implement getMenu**

Create `lib/menu/getMenu.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import { toLocalizedCategories } from './transform'
import type { LocalizedCategory, MenuRow } from './types'
import type { Locale } from '@/i18n/config'

export async function getMenu(locale: Locale): Promise<LocalizedCategory[]> {
  const supabase = await createClient()
  const [categories, dishes, groups, options] = await Promise.all([
    supabase.from('categories').select('id, name, sort, is_visible'),
    supabase.from('dishes').select('id, category_id, name, description, base_price, photo_url, is_available, tags, sort'),
    supabase.from('option_groups').select('id, dish_id, name, min_select, max_select, required, sort'),
    supabase.from('options').select('id, option_group_id, name, price_delta, sort'),
  ])

  const rows: MenuRow = {
    categories: (categories.data ?? []) as MenuRow['categories'],
    dishes: (dishes.data ?? []) as MenuRow['dishes'],
    option_groups: (groups.data ?? []) as MenuRow['option_groups'],
    options: (options.data ?? []) as MenuRow['options'],
  }
  return toLocalizedCategories(rows, locale)
}
```

- [ ] **Step 2: Smoke-test against local Supabase**

Ensure `npx supabase start` is running. Add a temporary route `app/[locale]/menu-debug/page.tsx` that renders `JSON.stringify(await getMenu(locale))`, open `/pl/menu-debug`, confirm the seeded dishes appear, then delete the temporary route.

- [ ] **Step 3: Commit**

```bash
git add lib/menu/getMenu.ts
git commit -m "feat: getMenu data access"
```

---

### Task 9: Menu UI — categories, dish cards, stop-list

**Files:**
- Create: `components/menu/CategoryNav.tsx`
- Create: `components/menu/DishCard.tsx`
- Create: `components/menu/MenuList.tsx`
- Create: `app/[locale]/menu/page.tsx`
- Test: `components/menu/__tests__/DishCard.test.tsx`

**Interfaces:**
- Consumes: `LocalizedCategory`/`LocalizedDish` (Task 7), `formatZloty` (Task 7), `Icon` (Task 3), `getMenu` (Task 8), translations (Task 4).
- Produces: a server-rendered `/{locale}/menu` page listing categories and dish cards in the dark-gourmet style; stop-listed dishes are dimmed with a "sold out" badge and a disabled add button.

- [ ] **Step 1: Write the failing DishCard test**

Create `components/menu/__tests__/DishCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, it, expect } from 'vitest'
import { DishCard } from '@/components/menu/DishCard'
import type { LocalizedDish } from '@/lib/menu/types'

const messages = { menu: { soldOut: 'Brak w sprzedaży', from: 'od' } }

function renderCard(dish: LocalizedDish) {
  return render(
    <NextIntlClientProvider locale="pl" messages={messages}>
      <DishCard dish={dish} locale="pl" />
    </NextIntlClientProvider>,
  )
}

const base: LocalizedDish = {
  id: 'd1', name: 'Barszcz', description: 'Z pampuszkami', basePrice: 2800,
  photoUrl: null, isAvailable: true, tags: [], optionGroups: [],
}

describe('DishCard', () => {
  it('shows name and formatted price', () => {
    renderCard(base)
    expect(screen.getByText('Barszcz')).toBeInTheDocument()
    expect(screen.getByText(/28,00/)).toBeInTheDocument()
  })

  it('marks stop-listed dishes as sold out and disables add', () => {
    renderCard({ ...base, isAvailable: false })
    expect(screen.getByText('Brak w sprzedaży')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run components/menu/__tests__/DishCard.test.tsx`
Expected: FAIL — cannot resolve `@/components/menu/DishCard`.

- [ ] **Step 3: Implement DishCard**

Create `components/menu/DishCard.tsx`:

```tsx
import { useTranslations } from 'next-intl'
import { Icon } from '@/components/Icon'
import { formatZloty } from '@/lib/menu/price'
import type { LocalizedDish } from '@/lib/menu/types'
import type { Locale } from '@/i18n/config'

export function DishCard({ dish, locale }: { dish: LocalizedDish; locale: Locale }) {
  const t = useTranslations('menu')
  const hasOptions = dish.optionGroups.length > 0
  return (
    <article className={`flex gap-3 border-b border-line py-3 ${dish.isAvailable ? '' : 'opacity-45'}`}>
      <div className="h-16 w-16 flex-none rounded-xl bg-[radial-gradient(90%_90%_at_60%_70%,#7a3a12,#2a1408)]" />
      <div className="flex-1">
        <h3 className="flex flex-wrap items-center gap-2 text-sm">
          {dish.name}
          {hasOptions && dish.isAvailable && (
            <span className="rounded-md bg-[rgba(224,164,74,0.15)] px-1.5 py-0.5 text-[10px] font-semibold text-gold">
              {hasOptions ? `${dish.optionGroups[0].name}` : ''}
            </span>
          )}
          {!dish.isAvailable && (
            <span className="rounded-md bg-[rgba(229,72,77,0.15)] px-1.5 py-0.5 text-[10px] font-semibold text-danger">
              {t('soldOut')}
            </span>
          )}
        </h3>
        {dish.description && <p className="mt-0.5 text-xs text-muted">{dish.description}</p>}
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-sm font-bold text-gold">
            {hasOptions ? `${t('from')} ` : ''}{formatZloty(dish.basePrice, locale)}
          </span>
          <button
            type="button"
            aria-label="add"
            disabled={!dish.isAvailable}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold text-[#241704] disabled:bg-[#3a332a] disabled:text-[#7a7266]"
          >
            <Icon name="plus" size={15} />
          </button>
        </div>
      </div>
    </article>
  )
}
```

> Note: the add button is non-functional here — cart wiring lands in the checkout plan (Ф2). It renders and correctly disables for stop-listed dishes.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run components/menu/__tests__/DishCard.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement CategoryNav and MenuList**

Create `components/menu/CategoryNav.tsx`:

```tsx
'use client'
import type { LocalizedCategory } from '@/lib/menu/types'

export function CategoryNav({ categories }: { categories: LocalizedCategory[] }) {
  return (
    <nav className="flex gap-2 overflow-x-auto py-3">
      {categories.map((c) => (
        <a
          key={c.id}
          href={`#cat-${c.id}`}
          className="whitespace-nowrap rounded-full border border-line px-3 py-1.5 text-xs text-muted"
        >
          {c.name}
        </a>
      ))}
    </nav>
  )
}
```

Create `components/menu/MenuList.tsx`:

```tsx
import { DishCard } from './DishCard'
import type { LocalizedCategory } from '@/lib/menu/types'
import type { Locale } from '@/i18n/config'

export function MenuList({ categories, locale }: { categories: LocalizedCategory[]; locale: Locale }) {
  return (
    <div>
      {categories.map((c) => (
        <section key={c.id} id={`cat-${c.id}`} className="mb-6">
          <h2 className="mb-1 text-xl">{c.name}</h2>
          {c.dishes.map((d) => (
            <DishCard key={d.id} dish={d} locale={locale} />
          ))}
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Implement the menu page**

Create `app/[locale]/menu/page.tsx`:

```tsx
import { setRequestLocale } from 'next-intl/server'
import { getMenu } from '@/lib/menu/getMenu'
import { CategoryNav } from '@/components/menu/CategoryNav'
import { MenuList } from '@/components/menu/MenuList'
import type { Locale } from '@/i18n/config'

export default async function MenuPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale as Locale)
  const categories = await getMenu(locale as Locale)
  return (
    <main className="mx-auto max-w-2xl px-4">
      <CategoryNav categories={categories} />
      <MenuList categories={categories} locale={locale as Locale} />
    </main>
  )
}
```

- [ ] **Step 7: Verify in the browser**

Run `npm run dev` (with `supabase start` running). Open `/pl/menu`, `/uk/menu`, `/ru/menu`:
- Seeded categories and dishes render.
- `Kotlet po kijowsku` is dimmed with the sold-out badge and a disabled add button.
- Switching locale in the URL changes dish names (ru/uk), falling back to Polish where a translation is missing.

Run `npm test` — all tests pass.

- [ ] **Step 8: Commit**

```bash
git add app/[locale]/menu components/menu
git commit -m "feat: menu browsing UI with stop-list handling"
```

---

### Task 10: Home page + header with language switcher

**Files:**
- Create: `components/LanguageSwitcher.tsx`
- Create: `components/SiteHeader.tsx`
- Create: `app/[locale]/page.tsx` (replace scaffold)
- Test: `components/__tests__/LanguageSwitcher.test.tsx`

**Interfaces:**
- Consumes: `Icon` (Task 3), `LOCALES` (Task 4), translations (Task 4).
- Produces: a dark-gourmet home hero and a shared header with nav + a working locale switcher that swaps the leading locale segment in the pathname.

- [ ] **Step 1: Write the failing LanguageSwitcher test**

Create `components/__tests__/LanguageSwitcher.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

const replace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/pl/menu',
}))

import { LanguageSwitcher } from '@/components/LanguageSwitcher'

describe('LanguageSwitcher', () => {
  it('swaps the locale segment on change', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(<LanguageSwitcher current="pl" />)
    await user.selectOptions(screen.getByRole('combobox'), 'ru')
    expect(replace).toHaveBeenCalledWith('/ru/menu')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run components/__tests__/LanguageSwitcher.test.tsx`
Expected: FAIL — cannot resolve `@/components/LanguageSwitcher`.

- [ ] **Step 3: Implement LanguageSwitcher**

Create `components/LanguageSwitcher.tsx`:

```tsx
'use client'
import { usePathname, useRouter } from 'next/navigation'
import { LOCALES, type Locale } from '@/i18n/config'
import { Icon } from '@/components/Icon'

export function LanguageSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname()
  const router = useRouter()

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value
    const segments = pathname.split('/')
    segments[1] = next // replace leading locale segment
    router.replace(segments.join('/'))
  }

  return (
    <label className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-muted">
      <Icon name="globe" size={13} />
      <select value={current} onChange={onChange} className="bg-transparent uppercase outline-none">
        {LOCALES.map((l) => (
          <option key={l} value={l} className="text-black">
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run components/__tests__/LanguageSwitcher.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Implement SiteHeader**

Create `components/SiteHeader.tsx`:

```tsx
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import type { Locale } from '@/i18n/config'

export function SiteHeader({ locale }: { locale: Locale }) {
  const t = useTranslations('nav')
  return (
    <header className="flex items-center justify-between border-b border-line px-5 py-3.5 text-xs">
      <Link href={`/${locale}`} className="text-base tracking-wide" style={{ fontFamily: 'var(--font-serif)' }}>
        Smacznego
      </Link>
      <nav className="hidden gap-4 text-muted sm:flex">
        <Link href={`/${locale}/menu`}>{t('menu')}</Link>
        <Link href={`/${locale}#about`}>{t('about')}</Link>
        <Link href={`/${locale}#delivery`}>{t('delivery')}</Link>
        <Link href={`/${locale}#contact`}>{t('contact')}</Link>
      </nav>
      <div className="flex items-center gap-2.5 text-muted">
        <LanguageSwitcher current={locale} />
        <span className="flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 font-bold text-[#241704]">
          <Icon name="cart" size={15} />0
        </span>
      </div>
    </header>
  )
}
```

- [ ] **Step 6: Implement the home page**

Replace `app/[locale]/page.tsx` with:

```tsx
import { setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import { SiteHeader } from '@/components/SiteHeader'
import type { Locale } from '@/i18n/config'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale as Locale)
  return (
    <>
      <SiteHeader locale={locale as Locale} />
      <main className="mx-auto grid max-w-5xl gap-6 px-6 py-10 md:grid-cols-2 md:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Otwarte do 22:00 · dostawa ~40 min
          </span>
          <h1 className="my-3 text-5xl leading-tight">
            Domowa kuchnia,<br />
            <span className="italic text-gold">bez pośpiechu</span>
          </h1>
          <p className="mb-5 max-w-sm text-sm text-muted">
            Barszcz, pierogi, domowe kotlety — gotujemy naprawdę i dowozimy ciepłe pod Twoje drzwi.
          </p>
          <Link
            href={`/${locale}/menu`}
            className="inline-block rounded-lg bg-gold px-5 py-3 text-sm font-bold text-[#241704]"
          >
            Zamów dostawę
          </Link>
        </div>
        <div className="min-h-56 rounded-2xl bg-[radial-gradient(60%_60%_at_60%_35%,#b5641f,#3a1c0a)] shadow-2xl" />
      </main>
    </>
  )
}
```

- [ ] **Step 7: Verify and full test run**

Run `npm run dev`. Open `/pl`, `/uk`, `/ru`: header renders, language switcher changes the URL locale and reloads content, "Zamów dostawę" links to the menu. Confirm no emoji anywhere.

Run: `npm test`
Expected: all suites PASS.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add app/[locale]/page.tsx components/SiteHeader.tsx components/LanguageSwitcher.tsx components/__tests__/LanguageSwitcher.test.tsx
git commit -m "feat: home hero + header with language switcher"
```

---

## Definition of Done

- `npm test` and `npm run build` both pass.
- `/pl/menu`, `/uk/menu`, `/ru/menu` render the seeded menu with correct localization and pl-fallback.
- Stop-listed dishes are visibly sold-out and non-orderable.
- No emoji anywhere; all icons are SVG.
- Money is grosze end-to-end; prices display as `zł`.
- Foundation is ready for the checkout plan (Ф2): `getMenu`, localized types, `dishPriceGrosze`, design tokens, i18n, and Supabase wiring are all in place.
