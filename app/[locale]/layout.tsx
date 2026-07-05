import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { LOCALES, type Locale } from '@/i18n/config'
import { serif, sans } from '@/lib/fonts'
import { getSettings } from '@/lib/settings/getSettings'
import { SettingsProvider } from '@/components/SettingsProvider'

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
    <html lang={locale} className={`${serif.variable} ${sans.variable}`}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <SettingsProvider value={settings}>{children}</SettingsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
