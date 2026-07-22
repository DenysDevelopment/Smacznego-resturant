import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { LOCALES, type Locale } from '@/i18n/config'
import { display, body } from '@/lib/fonts'
import { getSettings } from '@/lib/settings/getSettings'
import { SettingsProvider } from '@/components/SettingsProvider'
import { CartProvider } from '@/components/CartProvider'
import { SiteFooter } from '@/components/SiteFooter'

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
  const settings = await getSettings()
  return (
    <html lang={locale} className={`${display.variable} ${body.variable}`}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <SettingsProvider value={settings}>
            <CartProvider>
              {children}
              <SiteFooter locale={locale as Locale} />
            </CartProvider>
          </SettingsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
