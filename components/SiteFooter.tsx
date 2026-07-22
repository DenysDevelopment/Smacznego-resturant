import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getSettings } from '@/lib/settings/getSettings'
import { summarizeHours } from '@/lib/hours/summarize'
import { Icon } from '@/components/Icon'
import type { Locale } from '@/i18n/config'

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`
}

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations('footer')
  const nav = await getTranslations('nav')
  const s = await getSettings()
  const lines = summarizeHours(s.hours)
  const year = new Date().getFullYear()

  const dayLabel = (d: string) => t(`days.${d}` as 'days.mon')

  return (
    <footer className="mt-24 bg-ink text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.5fr_1fr_1.1fr_1fr]">
        {/* Brand */}
        <div>
          <p className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Smacznego<span className="text-beet">.</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-paper/70">{t('tagline')}</p>
          <p className="mt-4 text-sm font-bold uppercase tracking-wide text-mustard">{t('values')}</p>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2.5 text-sm">
          <span className="mb-1 text-xs font-bold uppercase tracking-widest text-paper/40">{t('nav')}</span>
          <Link href={`/${locale}/menu`} className="text-paper/80 transition-colors hover:text-mustard">{nav('menu')}</Link>
          <Link href={`/${locale}#about`} className="text-paper/80 transition-colors hover:text-mustard">{nav('about')}</Link>
          <Link href={`/${locale}#delivery`} className="text-paper/80 transition-colors hover:text-mustard">{nav('delivery')}</Link>
          <Link href={`/${locale}#contact`} className="text-paper/80 transition-colors hover:text-mustard">{nav('contact')}</Link>
        </nav>

        {/* Contact */}
        <div className="flex flex-col gap-3 text-sm">
          <span className="mb-1 text-xs font-bold uppercase tracking-widest text-paper/40">{t('contact')}</span>
          <a href={telHref(s.phone)} className="flex items-center gap-2 font-semibold text-paper transition-colors hover:text-mustard">
            <Icon name="phone" size={16} className="text-beet" />{s.phone}
          </a>
          <p className="flex items-start gap-2 text-paper/80">
            <Icon name="pin" size={16} className="mt-0.5 shrink-0 text-beet" />{s.addressText}
          </p>
          <p className="flex items-center gap-2 text-paper/80">
            <Icon name="wallet" size={16} className="text-beet" />{t('payNote')}
          </p>
        </div>

        {/* Hours */}
        <div className="text-sm">
          <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-paper/40">{t('hours')}</span>
          <dl className="mt-2 space-y-1.5">
            {lines.map((line) => (
              <div key={line.days[0]} className="flex justify-between gap-4">
                <dt className="text-paper/60">
                  {line.days.length === 1
                    ? dayLabel(line.days[0])
                    : `${dayLabel(line.days[0])}–${dayLabel(line.days[line.days.length - 1])}`}
                </dt>
                <dd className="font-semibold tabular-nums text-paper/90">
                  {line.hours ? `${line.hours.open}–${line.hours.close}` : t('closed')}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="border-t border-paper/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-5 text-xs text-paper/50 sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} {s.name}. {t('rights')}.</span>
          <span>{t('payNote')}</span>
          <span className="author-signature">
            Developed with 💛 by{' '}
            <a
              href="https://denys_maksymuck.t.me"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-mustard transition-colors hover:text-paper"
            >
              Denys
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}
