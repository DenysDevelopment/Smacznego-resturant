// Fixed-window in-memory rate limiter. State lives in the server process:
// it resets on restart and is not shared across instances — acceptable for a
// single-node deployment; the upgrade path is a DB-backed attempts table.

interface Bucket { count: number; windowStart: number }

export interface RateLimiter {
  /** Has `key` exhausted its budget in the current window? */
  isLimited(key: string, now?: number): boolean
  /** Record one hit against `key`. */
  hit(key: string, now?: number): void
  /** Budget left for `key` in the current window. */
  remaining(key: string, now?: number): number
}

const MAX_KEYS = 10_000

export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  const buckets = new Map<string, Bucket>()

  function live(key: string, now: number): Bucket | undefined {
    const b = buckets.get(key)
    if (!b) return undefined
    if (now - b.windowStart >= windowMs) {
      buckets.delete(key)
      return undefined
    }
    return b
  }

  function prune(now: number): void {
    if (buckets.size < MAX_KEYS) return
    for (const [key, b] of buckets) {
      if (now - b.windowStart >= windowMs) buckets.delete(key)
    }
  }

  return {
    isLimited(key, now = Date.now()) {
      const b = live(key, now)
      return !!b && b.count >= limit
    },
    hit(key, now = Date.now()) {
      prune(now)
      const b = live(key, now)
      if (b) b.count += 1
      else buckets.set(key, { count: 1, windowStart: now })
    },
    remaining(key, now = Date.now()) {
      const b = live(key, now)
      return Math.max(0, limit - (b?.count ?? 0))
    },
  }
}

export const GLOBAL_KEY = '__global__'

/**
 * First hop of x-forwarded-for. Spoofable by the client — per-IP limits must
 * be paired with a GLOBAL_KEY backstop on the same code path.
 */
export function clientIpFrom(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0].trim()
    if (first) return first
  }
  return headers.get('x-real-ip')?.trim() || 'unknown'
}

// Shared per-process instances.
export const loginIpLimiter = createRateLimiter(5, 15 * 60_000)
export const loginGlobalLimiter = createRateLimiter(100, 15 * 60_000)
export const orderIpLimiter = createRateLimiter(5, 10 * 60_000)
