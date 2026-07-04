import { getTranslations, setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import { SiteHeader } from '@/components/SiteHeader'
import type { Locale } from '@/i18n/config'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale as Locale)
  const t = await getTranslations('home')
  return (
    <>
      <SiteHeader locale={locale as Locale} />
      <main className="mx-auto grid max-w-5xl gap-6 px-6 py-10 md:grid-cols-2 md:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {t('status')}
          </span>
          <h1 className="my-3 text-5xl leading-tight">
            {t('title')}<br />
            <span className="italic text-gold">{t('titleAccent')}</span>
          </h1>
          <p className="mb-5 max-w-sm text-sm text-muted">
            {t('subcopy')}
          </p>
          <Link
            href={`/${locale}/menu`}
            className="inline-block rounded-lg bg-gold px-5 py-3 text-sm font-bold text-espresso"
          >
            {t('cta')}
          </Link>
        </div>
        <div className="min-h-56 rounded-2xl bg-[radial-gradient(60%_60%_at_60%_35%,#b5641f,#3a1c0a)] shadow-2xl" />
      </main>
    </>
  )
}
