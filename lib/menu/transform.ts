import { localize } from '@/lib/localize'
import type { Locale } from '@/i18n/config'
import type { LocalizedCategory, MenuRow } from './types'

export function toLocalizedCategories(rows: MenuRow, locale: Locale): LocalizedCategory[] {
  const optionsByGroup = new Map<string, MenuRow['options']>()
  for (const o of rows.options) {
    const list = optionsByGroup.get(o.option_group_id) ?? []
    list.push(o)
    optionsByGroup.set(o.option_group_id, list)
  }

  const groupsByDish = new Map<string, MenuRow['option_groups']>()
  for (const g of rows.option_groups) {
    const list = groupsByDish.get(g.dish_id) ?? []
    list.push(g)
    groupsByDish.set(g.dish_id, list)
  }

  const dishesByCategory = new Map<string, MenuRow['dishes']>()
  for (const d of rows.dishes) {
    const list = dishesByCategory.get(d.category_id) ?? []
    list.push(d)
    dishesByCategory.set(d.category_id, list)
  }

  const bySort = <T extends { sort: number }>(a: T, b: T) => a.sort - b.sort

  return rows.categories
    .filter((c) => c.is_visible)
    .sort(bySort)
    .map((c) => ({
      id: c.id,
      name: localize(c.name, locale),
      dishes: (dishesByCategory.get(c.id) ?? [])
        .slice()
        .sort(bySort)
        .map((d) => ({
          id: d.id,
          name: localize(d.name, locale),
          description: localize(d.description, locale),
          basePrice: d.base_price,
          photoUrl: d.photo_url,
          isAvailable: d.is_available,
          tags: d.tags,
          optionGroups: (groupsByDish.get(d.id) ?? [])
            .slice()
            .sort(bySort)
            .map((g) => ({
              id: g.id,
              name: localize(g.name, locale),
              minSelect: g.min_select,
              maxSelect: g.max_select,
              required: g.required,
              options: (optionsByGroup.get(g.id) ?? [])
                .slice()
                .sort(bySort)
                .map((o) => ({ id: o.id, name: localize(o.name, locale), priceDelta: o.price_delta })),
            })),
        })),
    }))
}
