import { describe, it, expect } from 'vitest'
import { dishPriceGrosze, formatZloty } from '@/lib/menu/price'

describe('dishPriceGrosze', () => {
  it('adds option deltas to the base price', () => {
    expect(dishPriceGrosze(2800, [{ priceDelta: 700 }, { priceDelta: 0 }])).toBe(3500)
  })
  it('returns the base price with no options', () => {
    expect(dishPriceGrosze(2400, [])).toBe(2400)
  })
})

describe('formatZloty', () => {
  it('formats grosze as zloty', () => {
    const s = formatZloty(2800, 'pl')
    expect(s).toContain('28,00')
    expect(s).toContain('zł')
  })
  it('always renders zł (not PLN) for ru and uk', () => {
    for (const loc of ['ru', 'uk'] as const) {
      const s = formatZloty(2800, loc)
      expect(s).toContain('28,00')
      expect(s).toContain('zł')
      expect(s).not.toContain('PLN')
    }
  })
})
