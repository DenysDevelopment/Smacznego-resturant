import type { Locale } from '@/i18n/config'

export function dishPriceGrosze(basePrice: number, selected: { priceDelta: number }[]): number {
  return selected.reduce((sum, o) => sum + o.priceDelta, basePrice)
}

export function formatZloty(grosze: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
  }).format(grosze / 100)
}
