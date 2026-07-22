import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { CartBadge } from '@/components/cart/CartBadge'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { MobileNav } from '@/components/MobileNav'
import { OrdersMenu } from '@/components/order/OrdersMenu'
import type { Locale } from '@/i18n/config'

export function SiteHeader({ locale }: { locale: Locale }) {
  const t = useTranslations('nav')
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link
          href={`/${locale}`}
          className="text-xl font-extrabold tracking-tight text-ink"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Smacznego<span className="text-beet">.</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium whitespace-nowrap text-ink/70 md:flex lg:gap-6">
          <Link href={`/${locale}/menu`} className="transition-colors hover:text-beet">{t('menu')}</Link>
          <Link href={`/${locale}#about`} className="transition-colors hover:text-beet">{t('about')}</Link>
          <Link href={`/${locale}#delivery`} className="transition-colors hover:text-beet">{t('delivery')}</Link>
          <Link href={`/${locale}#contact`} className="transition-colors hover:text-beet">{t('contact')}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <OrdersMenu locale={locale} />
          {/* language moves into the mobile menu below md to leave room */}
          <div className="hidden md:block">
            <LanguageSwitcher current={locale} label={t('language')} />
          </div>
          <CartBadge locale={locale} />
          <MobileNav locale={locale} />
        </div>
      </div>
    </header>
  )
}
