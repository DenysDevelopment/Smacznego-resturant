import { getRequestConfig } from 'next-intl/server'
import { LOCALES, DEFAULT_LOCALE, type Locale } from './config'
import { getContentOverrides } from '@/lib/content/getOverrides'
import { mergeMessages } from '@/lib/content/merge'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale: Locale = (LOCALES as readonly string[]).includes(requested ?? '')
    ? (requested as Locale)
    : DEFAULT_LOCALE
  const base = (await import(`../messages/${locale}.json`)).default
  // admin-edited copy from site_content wins over the static JSON
  const messages = mergeMessages(base, await getContentOverrides(), locale)
  return { locale, messages: messages as typeof base }
})
