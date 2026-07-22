import { setRequestLocale } from 'next-intl/server'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import { SiteHeader } from '@/components/SiteHeader'
import type { Locale } from '@/i18n/config'

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale as Locale)
  return (
    <>
      <SiteHeader locale={locale as Locale} />
      <CheckoutForm locale={locale as Locale} />
    </>
  )
}
