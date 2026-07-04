import { describe, it, expect } from 'vitest'
import { localize } from '@/lib/localize'

describe('localize', () => {
  const field = { pl: 'Barszcz', uk: 'Борщ', ru: 'Борщ' }

  it('returns the requested locale', () => {
    expect(localize(field, 'uk')).toBe('Борщ')
  })

  it('falls back to pl when the locale is missing', () => {
    expect(localize({ pl: 'Barszcz' }, 'uk')).toBe('Barszcz')
  })

  it('returns empty string for null field', () => {
    expect(localize(null, 'ru')).toBe('')
  })
})
