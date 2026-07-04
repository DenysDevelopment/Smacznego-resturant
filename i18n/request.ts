import { getRequestConfig } from 'next-intl/server'
import { LOCALES, DEFAULT_LOCALE, type Locale } from './config'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale: Locale = (LOCALES as readonly string[]).includes(requested ?? '')
    ? (requested as Locale)
    : DEFAULT_LOCALE
  return { locale, messages: (await import(`../messages/${locale}.json`)).default }
})
