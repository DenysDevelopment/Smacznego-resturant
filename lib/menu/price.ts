import type { Locale } from '@/i18n/config'

export function dishPriceGrosze(basePrice: number, selected: { priceDelta: number }[]): number {
  return selected.reduce((sum, o) => sum + o.priceDelta, basePrice)
}

export function formatZloty(grosze: number, locale: Locale): string {
  // Always display the Polish "zł" symbol; use the active locale only for
  // number grouping/decimals. Passing currency:'PLN' would render "PLN" for
  // ru/uk locales, so we format the number and append the symbol ourselves.
  const amount = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(grosze / 100)
  return `${amount} zł`
}
