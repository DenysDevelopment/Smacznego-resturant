import { describe, it, expect } from 'vitest'
import { parseZlotyToGrosze, formatGroszeToZlotyInput } from '@/lib/menu/admin/money'

describe('parseZlotyToGrosze', () => {
  it('parses integers and decimals with comma or dot', () => {
    expect(parseZlotyToGrosze('34')).toBe(3400)
    expect(parseZlotyToGrosze('34,00')).toBe(3400)
    expect(parseZlotyToGrosze('34.5')).toBe(3450)
    expect(parseZlotyToGrosze('0')).toBe(0)
    expect(parseZlotyToGrosze(' 12.99 ')).toBe(1299)
  })

  it('rejects empty, garbage, negatives and >2 decimals', () => {
    expect(parseZlotyToGrosze('')).toBeNull()
    expect(parseZlotyToGrosze('abc')).toBeNull()
    expect(parseZlotyToGrosze('-1')).toBeNull()
    expect(parseZlotyToGrosze('1.999')).toBeNull()
    expect(parseZlotyToGrosze('1,2,3')).toBeNull()
  })

  it('allows negatives only with allowNegative (option deltas)', () => {
    expect(parseZlotyToGrosze('-2,50', { allowNegative: true })).toBe(-250)
    expect(parseZlotyToGrosze('3', { allowNegative: true })).toBe(300)
  })
})

describe('formatGroszeToZlotyInput', () => {
  it('formats grosze for form prefill', () => {
    expect(formatGroszeToZlotyInput(3400)).toBe('34.00')
    expect(formatGroszeToZlotyInput(3450)).toBe('34.50')
    expect(formatGroszeToZlotyInput(5)).toBe('0.05')
    expect(formatGroszeToZlotyInput(-250)).toBe('-2.50')
  })
})
