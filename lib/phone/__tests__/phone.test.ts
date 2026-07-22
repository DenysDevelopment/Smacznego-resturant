import { describe, it, expect } from 'vitest'
import { normalizePhone, isValidPlPhone } from '@/lib/phone/phone'

describe('normalizePhone', () => {
  it('strips spaces, dashes, parens; keeps leading +', () => {
    expect(normalizePhone(' +48 500-100 200 ')).toBe('+48500100200')
    expect(normalizePhone('(500) 100 200')).toBe('500100200')
  })
})

describe('isValidPlPhone', () => {
  it('accepts 9 digits with or without +48/48/0 prefix', () => {
    expect(isValidPlPhone('500100200')).toBe(true)
    expect(isValidPlPhone('+48 500 100 200')).toBe(true)
    expect(isValidPlPhone('48500100200')).toBe(true)
    expect(isValidPlPhone('0500100200')).toBe(true)
  })
  it('rejects wrong length or letters', () => {
    expect(isValidPlPhone('12345')).toBe(false)
    expect(isValidPlPhone('50010020a')).toBe(false)
    expect(isValidPlPhone('')).toBe(false)
  })
  it('does not mangle a bare 9-digit number that starts with 48', () => {
    expect(isValidPlPhone('485001002')).toBe(true)
  })
  it('rejects an over-length stacked prefix', () => {
    expect(isValidPlPhone('048500100200')).toBe(false)
  })
})
