export const LOCALES = ['pl', 'uk', 'ru'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'pl'
