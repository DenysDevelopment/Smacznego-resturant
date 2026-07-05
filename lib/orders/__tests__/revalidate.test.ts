import { describe, it, expect } from 'vitest'
import { revalidateItems } from '@/lib/orders/revalidate'
import type { CartItem } from '@/lib/cart/types'

const dbDishes = [
  { id: 'd1', name: { pl: 'Barszcz' }, base_price: 2800, is_available: true,
    option_groups: [{ id: 'g1', options: [{ id: 'o2', name: { pl: '500 ml' }, price_delta: 700 }] }] },
  { id: 'd3', name: { pl: 'Kotlet' }, base_price: 3200, is_available: false, option_groups: [] },
]

const good: CartItem = { dishId: 'd1', name: 'stale', unitPrice: 999, qty: 2,
  selectedOptions: [{ groupId: 'g1', groupName: 'x', optionId: 'o2', optionName: 'y', priceDelta: 111 }] }

describe('revalidateItems', () => {
  it('recomputes name + price from the DB (ignores client-sent values)', () => {
    const r = revalidateItems([good], dbDishes, 'pl')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.items[0].unitPrice).toBe(3500) // 2800 + 700 (server truth, not 999/111)
      expect(r.items[0].name).toBe('Barszcz')
      expect(r.items[0].lineTotal).toBe(7000)
    }
  })
  it('rejects a stop-listed dish', () => {
    const r = revalidateItems([{ ...good, dishId: 'd3', selectedOptions: [] }], dbDishes, 'pl')
    expect(r.ok).toBe(false)
  })
  it('rejects an unknown option id', () => {
    const bad: CartItem = { ...good, selectedOptions: [{ groupId: 'g1', groupName: 'x', optionId: 'nope', optionName: 'y', priceDelta: 0 }] }
    const r = revalidateItems([bad], dbDishes, 'pl')
    expect(r.ok).toBe(false)
  })
})
