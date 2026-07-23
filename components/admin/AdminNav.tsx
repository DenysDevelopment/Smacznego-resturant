'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { logout } from '@/lib/auth/actions'
import { Icon } from '@/components/Icon'

const TABS = [
  { href: '/admin', label: 'Заказы' },
  { href: '/admin/menu', label: 'Меню' },
  { href: '/admin/logs', label: 'История' },
  { href: '/admin/texts', label: 'Тексты' },
  { href: '/admin/settings', label: 'Настройки' },
]

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
  const activeLabel = TABS.find((t) => isActive(t.href))?.label ?? ''

  const doLogout = () =>
    start(async () => {
      await logout('staff')
      router.replace('/admin/login')
    })

  return (
    <header className="border-b border-line bg-panel">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:px-5">
        <span className="font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Smacznego<span className="text-beet">.</span>
        </span>

        {/* desktop: inline tabs */}
        <nav className="ml-4 hidden flex-1 items-center gap-1 sm:flex">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                isActive(tab.href) ? 'bg-beet text-paper' : 'text-ink/70 hover:bg-beet/10 hover:text-ink'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {/* desktop: logout */}
        <button
          type="button"
          disabled={pending}
          onClick={doLogout}
          className="hidden shrink-0 rounded-full border border-line px-4 py-1.5 text-sm font-semibold text-ink/70 hover:bg-ink hover:text-paper disabled:opacity-50 sm:inline-flex"
        >
          Выйти
        </button>

        {/* mobile: current section + hamburger */}
        <span className="ml-auto text-sm font-bold text-beet sm:hidden">{activeLabel}</span>
        <button
          type="button"
          aria-label="Меню"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors active:bg-ink/10 sm:hidden"
        >
          <Icon name="bars" size={22} />
        </button>
      </div>

      {/* mobile menu */}
      {open && (
        <div className="fixed inset-0 z-50 sm:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />
          <nav
            className="absolute inset-x-0 top-0 rounded-b-3xl bg-paper px-5 pb-6 pt-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                Smacznego<span className="text-beet">.</span>
              </span>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors active:bg-ink/10"
              >
                <Icon name="close" size={22} />
              </button>
            </div>

            <div className="mt-3 flex flex-col">
              {TABS.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between border-b border-line py-4 text-lg font-bold transition-colors ${
                    isActive(tab.href) ? 'text-beet' : 'text-ink active:text-beet'
                  }`}
                >
                  {tab.label}
                  <Icon name="chevron" size={18} className="-rotate-90 text-muted" />
                </Link>
              ))}
            </div>

            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setOpen(false)
                doLogout()
              }}
              className="mt-5 w-full rounded-2xl border border-line py-3.5 text-base font-bold text-ink/70 disabled:opacity-50"
            >
              Выйти
            </button>
          </nav>
        </div>
      )}
    </header>
  )
}
