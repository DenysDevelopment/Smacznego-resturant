import { setRequestLocale } from 'next-intl/server'
import { CartView } from '@/components/cart/CartView'
import { SiteHeader } from '@/components/SiteHeader'
import type { Locale } from '@/i18n/config'

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale as Locale)
  return (<><SiteHeader locale={locale as Locale} /><CartView locale={locale as Locale} /></>)
}
