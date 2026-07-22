import type { CartItem } from './types'

export function itemKey(item: CartItem): string {
  const opts = item.selectedOptions.map((o) => o.optionId).sort().join(',')
  return `${item.dishId}|${opts}`
}
