import { describe, it, expect } from 'vitest'
import { toLocalizedCategories } from '@/lib/menu/transform'
import type { MenuRow } from '@/lib/menu/types'

const rows: MenuRow = {
  categories: [
    { id: 'c1', name: { pl: 'Zupy', ru: 'Супы' }, sort: 1, is_visible: true },
    { id: 'c2', name: { pl: 'Ukryte' }, sort: 2, is_visible: false },
  ],
  dishes: [
    { id: 'd1', category_id: 'c1', name: { pl: 'Barszcz', ru: 'Борщ' }, description: {}, base_price: 2800, photo_url: null, is_available: true, tags: [], sort: 2 },
    { id: 'd2', category_id: 'c1', name: { pl: 'Rosół' }, description: {}, base_price: 2000, photo_url: null, is_available: false, tags: [], sort: 1 },
  ],
  option_groups: [
    { id: 'g1', dish_id: 'd1', name: { pl: 'Rozmiar' }, min_select: 1, max_select: 1, required: true, sort: 1 },
  ],
  options: [
    { id: 'o1', option_group_id: 'g1', name: { pl: '500 ml' }, price_delta: 700, sort: 1 },
  ],
}

describe('toLocalizedCategories', () => {
  it('drops invisible categories', () => {
    const result = toLocalizedCategories(rows, 'ru')
    expect(result.map((c) => c.id)).toEqual(['c1'])
  })
  it('localizes with fallback and sorts dishes by sort', () => {
    const [cat] = toLocalizedCategories(rows, 'ru')
    expect(cat.name).toBe('Супы')
    expect(cat.dishes.map((d) => d.name)).toEqual(['Rosół', 'Борщ']) // d2 sort 1 before d1 sort 2; d2 pl-fallback
  })
  it('keeps stop-listed dishes but flags them', () => {
    const [cat] = toLocalizedCategories(rows, 'ru')
    const rosol = cat.dishes.find((d) => d.id === 'd2')!
    expect(rosol.isAvailable).toBe(false)
  })
  it('nests option groups and options', () => {
    const [cat] = toLocalizedCategories(rows, 'ru')
    const barszcz = cat.dishes.find((d) => d.id === 'd1')!
    expect(barszcz.optionGroups[0].options[0].priceDelta).toBe(700)
  })
})
