import { describe, it, expect } from 'vitest'
import { createRateLimiter, clientIpFrom } from '@/lib/auth/rateLimit'

describe('createRateLimiter', () => {
  it('allows hits under the limit, blocks at the limit', () => {
    const rl = createRateLimiter(3, 1000)
    expect(rl.isLimited('a', 0)).toBe(false)
    rl.hit('a', 0)
    rl.hit('a', 10)
    expect(rl.isLimited('a', 20)).toBe(false)
    rl.hit('a', 20)
    expect(rl.isLimited('a', 30)).toBe(true)
  })

  it('resets after the window elapses', () => {
    const rl = createRateLimiter(2, 1000)
    rl.hit('a', 0)
    rl.hit('a', 1)
    expect(rl.isLimited('a', 500)).toBe(true)
    expect(rl.isLimited('a', 1000)).toBe(false)
    rl.hit('a', 1000)
    expect(rl.remaining('a', 1001)).toBe(1)
  })

  it('tracks keys independently', () => {
    const rl = createRateLimiter(1, 1000)
    rl.hit('a', 0)
    expect(rl.isLimited('a', 1)).toBe(true)
    expect(rl.isLimited('b', 1)).toBe(false)
  })

  it('window is fixed from the first hit, not sliding', () => {
    const rl = createRateLimiter(2, 1000)
    rl.hit('a', 0)
    rl.hit('a', 999)
    expect(rl.isLimited('a', 999)).toBe(true)
    // new window starts at 1000 relative to first hit
    rl.hit('a', 1500)
    expect(rl.isLimited('a', 1500)).toBe(false)
  })

  it('remaining never goes below zero', () => {
    const rl = createRateLimiter(1, 1000)
    rl.hit('a', 0)
    rl.hit('a', 1)
    expect(rl.remaining('a', 2)).toBe(0)
  })
})

describe('clientIpFrom', () => {
  it('takes the first hop of x-forwarded-for', () => {
    const h = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })
    expect(clientIpFrom(h)).toBe('1.2.3.4')
  })
  it('falls back to x-real-ip, then "unknown"', () => {
    expect(clientIpFrom(new Headers({ 'x-real-ip': '9.9.9.9' }))).toBe('9.9.9.9')
    expect(clientIpFrom(new Headers())).toBe('unknown')
  })
})
