import { describe, it, expect } from 'vitest'
import { warsawStartOfDayUtc, warsawNextMidnightUtc } from '@/lib/time/warsaw'

describe('warsawStartOfDayUtc', () => {
  it('summer (CEST, UTC+2): 00:00 Warsaw = 22:00 UTC previous day', () => {
    // 2026-07-22 12:00 UTC is 14:00 Warsaw (CEST)
    const start = warsawStartOfDayUtc(new Date('2026-07-22T12:00:00Z'))
    expect(start.toISOString()).toBe('2026-07-21T22:00:00.000Z')
  })

  it('winter (CET, UTC+1): 00:00 Warsaw = 23:00 UTC previous day', () => {
    const start = warsawStartOfDayUtc(new Date('2026-01-15T12:00:00Z'))
    expect(start.toISOString()).toBe('2026-01-14T23:00:00.000Z')
  })

  it('just after Warsaw midnight stays on the new day', () => {
    // 2026-07-21T22:30Z = 00:30 Warsaw on the 22nd
    const start = warsawStartOfDayUtc(new Date('2026-07-21T22:30:00Z'))
    expect(start.toISOString()).toBe('2026-07-21T22:00:00.000Z')
  })
})

describe('warsawNextMidnightUtc', () => {
  it('summer: next midnight is the following 22:00 UTC', () => {
    const next = warsawNextMidnightUtc(new Date('2026-07-22T12:00:00Z'))
    expect(next.toISOString()).toBe('2026-07-22T22:00:00.000Z')
    expect(next.getTime()).toBeGreaterThan(new Date('2026-07-22T12:00:00Z').getTime())
  })

  it('winter: next midnight is the following 23:00 UTC', () => {
    const next = warsawNextMidnightUtc(new Date('2026-01-15T12:00:00Z'))
    expect(next.toISOString()).toBe('2026-01-15T23:00:00.000Z')
  })

  it('is always strictly in the future and ~24h after start of day', () => {
    const now = new Date('2026-07-22T23:00:00Z') // 01:00 Warsaw next day
    const start = warsawStartOfDayUtc(now)
    const next = warsawNextMidnightUtc(now)
    expect(next.getTime()).toBeGreaterThan(now.getTime())
    expect(next.getTime() - start.getTime()).toBe(24 * 3600_000)
  })
})
