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
        <LanguageSwitcher current={locale} label={t('language')} />
        <span className="flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 font-bold text-espresso">
          <Icon name="cart" size={15} />0
        </span>
      </div>
    </header>
  )
}
