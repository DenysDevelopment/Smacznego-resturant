import { describe, it, expect } from 'vitest'
import { signSession, verifySession, checkPasscode } from '../passcode'

const SECRET = 'test-secret-123'
const T0 = 1_000_000_000_000 // fixed "now"
const HOUR = 3_600_000

describe('session token', () => {
  it('round-trips a valid, unexpired token', () => {
    const token = signSession('staff', T0 + HOUR, SECRET)
    expect(verifySession(token, SECRET, T0)).toEqual({ role: 'staff', expiresAt: T0 + HOUR })
  })

  it('rejects an expired token', () => {
    const token = signSession('courier', T0 - 1, SECRET)
    expect(verifySession(token, SECRET, T0)).toBeNull()
  })

  it('rejects a tampered role', () => {
    const token = signSession('courier', T0 + HOUR, SECRET)
    const tampered = token.replace('courier', 'staff')
    expect(verifySession(tampered, SECRET, T0)).toBeNull()
  })

  it('rejects a wrong secret', () => {
    const token = signSession('staff', T0 + HOUR, SECRET)
    expect(verifySession(token, 'other-secret', T0)).toBeNull()
  })

  it('rejects malformed input', () => {
    expect(verifySession('', SECRET, T0)).toBeNull()
    expect(verifySession('a|b', SECRET, T0)).toBeNull()
  })
})

describe('checkPasscode', () => {
  const ENV = { ADMIN_PASSCODE: 'kitchen42', COURIER_PASSCODE: 'ride99' }
  it('accepts the correct code per role', () => {
    expect(checkPasscode('staff', 'kitchen42', ENV)).toBe(true)
    expect(checkPasscode('courier', 'ride99', ENV)).toBe(true)
  })
  it('rejects a wrong code', () => {
    expect(checkPasscode('staff', 'ride99', ENV)).toBe(false)
    expect(checkPasscode('courier', 'nope', ENV)).toBe(false)
  })
  it('rejects empty code or unset env', () => {
    expect(checkPasscode('staff', '', ENV)).toBe(false)
    expect(checkPasscode('staff', 'kitchen42', {})).toBe(false)
  })
})
