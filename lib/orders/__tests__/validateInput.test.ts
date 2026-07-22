import { describe, it, expect } from 'vitest'
import { validateOrderInput, validateSchedule } from '@/lib/orders/validateInput'
import type { CreateOrderInput } from '@/lib/orders/createOrder'
import type { WeeklyHours } from '@/lib/hours/hours'

function baseInput(over: Partial<CreateOrderInput> = {}): CreateOrderInput {
  return {
    locale: 'pl',
    type: 'pickup',
    name: 'Jan',
    phone: '+48 500 100 200',
    address: null,
    scheduledFor: null,
    notes: '',
    cashChangeFrom: null,
    cart: [{ dishId: 'd1', name: 'x', unitPrice: 1000, qty: 1, selectedOptions: [] }],
    ...over,
  }
}

describe('validateOrderInput', () => {
  it('accepts a minimal valid pickup order', () => {
    expect(validateOrderInput(baseInput())).toEqual({ ok: true })
  })

  it('rejects empty or oversized name', () => {
    expect(validateOrderInput(baseInput({ name: '  ' }))).toEqual({ ok: false, error: 'bad_name' })
    expect(validateOrderInput(baseInput({ name: 'x'.repeat(101) }))).toEqual({ ok: false, error: 'bad_name' })
  })

  it('rejects invalid phone', () => {
    expect(validateOrderInput(baseInput({ phone: '12345' }))).toEqual({ ok: false, error: 'bad_phone' })
  })

  it('rejects oversized notes', () => {
    expect(validateOrderInput(baseInput({ notes: 'x'.repeat(501) }))).toEqual({ ok: false, error: 'bad_notes' })
  })

  it('rejects bad cashChangeFrom', () => {
    expect(validateOrderInput(baseInput({ cashChangeFrom: -1 }))).toEqual({ ok: false, error: 'bad_cash' })
    expect(validateOrderInput(baseInput({ cashChangeFrom: 1_000_001 }))).toEqual({ ok: false, error: 'bad_cash' })
    expect(validateOrderInput(baseInput({ cashChangeFrom: 10.5 }))).toEqual({ ok: false, error: 'bad_cash' })
  })

  it('bounds cart size and qty', () => {
    const line = { dishId: 'd', name: 'x', unitPrice: 1, qty: 1, selectedOptions: [] }
    expect(validateOrderInput(baseInput({ cart: [] }))).toEqual({ ok: false, error: 'bad_cart' })
    expect(validateOrderInput(baseInput({ cart: Array(51).fill(line) }))).toEqual({ ok: false, error: 'bad_cart' })
    expect(validateOrderInput(baseInput({ cart: [{ ...line, qty: 100 }] }))).toEqual({ ok: false, error: 'bad_qty' })
    expect(validateOrderInput(baseInput({ cart: [{ ...line, qty: 0 }] }))).toEqual({ ok: false, error: 'bad_qty' })
    expect(validateOrderInput(baseInput({ cart: [{ ...line, qty: 1.5 }] }))).toEqual({ ok: false, error: 'bad_qty' })
  })

  it('requires an address with a street for delivery', () => {
    const addr = { street: 'Prosta', building: '1', apartment: '', floor: '', entrance: '', intercom: '', lat: null, lng: null, formatted: 'Prosta 1' }
    expect(validateOrderInput(baseInput({ type: 'delivery', address: null }))).toEqual({ ok: false, error: 'bad_address' })
    expect(validateOrderInput(baseInput({ type: 'delivery', address: { ...addr, street: ' ' } }))).toEqual({ ok: false, error: 'bad_address' })
    expect(validateOrderInput(baseInput({ type: 'delivery', address: { ...addr, formatted: 'x'.repeat(121) } }))).toEqual({ ok: false, error: 'bad_address' })
    expect(validateOrderInput(baseInput({ type: 'delivery', address: addr }))).toEqual({ ok: true })
  })
})

// Mon-Sun 10:00-22:00
const HOURS: WeeklyHours = {
  mon: { open: '10:00', close: '22:00' }, tue: { open: '10:00', close: '22:00' },
  wed: { open: '10:00', close: '22:00' }, thu: { open: '10:00', close: '22:00' },
  fri: { open: '10:00', close: '22:00' }, sat: { open: '10:00', close: '22:00' },
  sun: null,
}
// 2026-07-22 is a Wednesday; 12:00 Warsaw summer time = 10:00 UTC
const NOW = new Date('2026-07-22T10:00:00Z')

describe('validateSchedule', () => {
  it('accepts a slot inside hours, after prep lead, within 7 days', () => {
    expect(validateSchedule('2026-07-22T13:00', HOURS, 30, NOW)).toBe(true)
    expect(validateSchedule('2026-07-24T10:00', HOURS, 30, NOW)).toBe(true)
  })

  it('rejects malformed values', () => {
    expect(validateSchedule('tomorrow', HOURS, 30, NOW)).toBe(false)
    expect(validateSchedule('2026-07-22T25:00', HOURS, 30, NOW)).toBe(false)
    expect(validateSchedule('2026-13-40T12:00', HOURS, 30, NOW)).toBe(false)
  })

  it('rejects slots outside opening hours or on a closed day', () => {
    expect(validateSchedule('2026-07-22T09:00', HOURS, 30, NOW)).toBe(false)
    expect(validateSchedule('2026-07-22T22:00', HOURS, 30, NOW)).toBe(false)
    expect(validateSchedule('2026-07-26T12:00', HOURS, 30, NOW)).toBe(false) // Sunday closed
  })

  it('rejects the past and slots inside the prep lead', () => {
    expect(validateSchedule('2026-07-22T11:00', HOURS, 30, NOW)).toBe(false) // in the past
    expect(validateSchedule('2026-07-22T12:15', HOURS, 30, NOW)).toBe(false) // within 30-min lead
  })

  it('rejects slots more than 7 days ahead', () => {
    expect(validateSchedule('2026-07-30T12:00', HOURS, 30, NOW)).toBe(false)
  })
})
