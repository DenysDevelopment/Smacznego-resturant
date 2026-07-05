import { dishPriceGrosze } from '@/lib/menu/price'
import { localize } from '@/lib/localize'
import type { CartItem, SelectedOption } from '@/lib/cart/types'
import type { Locale } from '@/i18n/config'

export interface PricedItem {
  dishId: string; name: string; unitPrice: number; qty: number
  selectedOptions: SelectedOption[]; lineTotal: number
}

interface DbOption { id: string; name: Record<string, string>; price_delta: number }
interface DbGroup { id: string; options: DbOption[] }
interface DbDish { id: string; name: Record<string, string>; base_price: number; is_available: boolean; option_groups: DbGroup[] }

type Result = { ok: true; items: PricedItem[] } | { ok: false; error: string }

export function revalidateItems(cart: CartItem[], dbDishes: DbDish[], locale: Locale): Result {
  if (cart.length === 0) return { ok: false, error: 'empty_cart' }
  const byId = new Map(dbDishes.map((d) => [d.id, d]))
  const items: PricedItem[] = []

  for (const ci of cart) {
    if (ci.qty <= 0) return { ok: false, error: 'bad_qty' }
    const dish = byId.get(ci.dishId)
    if (!dish) return { ok: false, error: `unknown_dish:${ci.dishId}` }
    if (!dish.is_available) return { ok: false, error: `unavailable:${ci.dishId}` }

    const resolved: SelectedOption[] = []
    for (const so of ci.selectedOptions) {
      const group = dish.option_groups.find((g) => g.id === so.groupId)
      const opt = group?.options.find((o) => o.id === so.optionId)
      if (!group || !opt) return { ok: false, error: `unknown_option:${so.optionId}` }
      resolved.push({ groupId: group.id, groupName: so.groupName, optionId: opt.id, optionName: localize(opt.name, locale), priceDelta: opt.price_delta })
    }
    const unitPrice = dishPriceGrosze(dish.base_price, resolved)
    items.push({ dishId: dish.id, name: localize(dish.name, locale), unitPrice, qty: ci.qty, selectedOptions: resolved, lineTotal: unitPrice * ci.qty })
  }
  return { ok: true, items }
}
