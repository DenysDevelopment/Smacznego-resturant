import { describe, it, expect } from 'vitest'
import { warsawNow, isOpenNow, generateSlots, type WeeklyHours } from '@/lib/hours/hours'

const hours: WeeklyHours = {
  mon: { open: '11:00', close: '22:00' }, tue: { open: '11:00', close: '22:00' },
  wed: { open: '11:00', close: '22:00' }, thu: { open: '11:00', close: '22:00' },
  fri: { open: '11:00', close: '22:00' }, sat: { open: '12:00', close: '22:00' },
  sun: null,
}

// 2026-07-06 is a Monday. 10:00 UTC = 12:00 Warsaw (CEST, +2).
const monNoonWarsaw = new Date('2026-07-06T10:00:00Z')
const monMorningWarsaw = new Date('2026-07-06T06:00:00Z') // 08:00 Warsaw, before open

describe('warsawNow', () => {
  it('derives Warsaw weekday + minutes', () => {
    const p = warsawNow(monNoonWarsaw)
    expect(p.dayKey).toBe('mon')
    expect(p.dateStr).toBe('2026-07-06')
    expect(p.minutes).toBe(12 * 60)
  })
})

describe('isOpenNow', () => {
  it('open during hours', () => {
    expect(isOpenNow(hours, monNoonWarsaw)).toBe(true)
  })
  it('closed before opening', () => {
    expect(isOpenNow(hours, monMorningWarsaw)).toBe(false)
  })
  it('closed on a day-off (sunday null)', () => {
    expect(isOpenNow(hours, new Date('2026-07-05T12:00:00Z'))).toBe(false) // Sunday
  })
})

describe('generateSlots', () => {
  const slots = generateSlots(hours, 40, monNoonWarsaw, 1)
  it('starts no earlier than now + prep lead, rounded up to :00/:30', () => {
    // 12:00 + 40min = 12:40 -> first slot 13:00
    expect(slots[0].hhmm).toBe('13:00')
    expect(slots[0].dayKey).toBe('mon')
    expect(slots[0].value).toBe('2026-07-06T13:00')
  })
  it('stops at closing time', () => {
    expect(slots.some((s) => s.hhmm === '22:00')).toBe(false)
    expect(slots[slots.length - 1].hhmm <= '21:30').toBe(true)
  })
  it('30-minute steps', () => {
    expect(slots[1].hhmm).toBe('13:30')
  })
})
