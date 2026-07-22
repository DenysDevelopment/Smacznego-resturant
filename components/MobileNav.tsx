'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Icon } from '@/components/Icon'
import { useSettings } from '@/components/SettingsProvider'
import type { Locale } from '@/i18n/config'

const LINKS = [
  { href: '/menu', key: 'menu' },
  { href: '#about', key: 'about' },
  { href: '#delivery', key: 'delivery' },
  { href: '#contact', key: 'contact' },
] as const

export function MobileNav({ locale }: { locale: Locale }) {
  const t = useTranslations('nav')
  const s = useSettings()
  const [open, setOpen] = useState(false)

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={t('menu')}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors active:bg-ink/10"
      >
        <Icon name="bars" size={24} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
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
                aria-label={t('menu')}
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors active:bg-ink/10"
              >
                <Icon name="close" size={22} />
              </button>
            </div>

            <div className="mt-3 flex flex-col">
              {LINKS.map((l) => (
                <Link
                  key={l.key}
                  href={`/${locale}${l.href}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between border-b border-line py-4 text-lg font-bold text-ink transition-colors active:text-beet"
                >
                  {t(l.key)}
                  <Icon name="chevron" size={18} className="-rotate-90 text-muted" />
                </Link>
              ))}
            </div>

            <a
              href={`tel:${s.phone.replace(/[^+\d]/g, '')}`}
              className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-beet px-5 py-3.5 text-base font-bold text-paper"
            >
              <Icon name="phone" size={18} />{s.phone}
            </a>
          </nav>
        </div>
      )}
    </div>
  )
}
