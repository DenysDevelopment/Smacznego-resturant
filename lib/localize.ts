import { DEFAULT_LOCALE, type Locale } from '@/i18n/config'

export function localize(
  field: Partial<Record<Locale, string>> | null | undefined,
  locale: Locale,
): string {
  if (!field) return ''
  return field[locale] ?? field[DEFAULT_LOCALE] ?? ''
}
