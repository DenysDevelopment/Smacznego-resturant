import { describe, it, expect } from 'vitest'
import { guardTransition } from '../guard'

const order = { type: 'delivery' as const, status: 'preparing' as const }

describe('guardTransition', () => {
  it('rejects when there is no session', () => {
    expect(guardTransition(null, order, 'ready').ok).toBe(false)
  })
  it('rejects a courier trying an operator-only transition', () => {
    expect(guardTransition({ role: 'courier' }, order, 'ready').ok).toBe(false)
  })
  it('allows a courier hand-off transition', () => {
    const r = guardTransition({ role: 'courier' }, { type: 'delivery', status: 'ready' }, 'out_for_delivery')
    expect(r.ok).toBe(true)
  })
  it('allows staff operator transition', () => {
    expect(guardTransition({ role: 'staff' }, order, 'ready').ok).toBe(true)
  })
  it('rejects an illegal transition even for staff', () => {
    expect(guardTransition({ role: 'staff' }, order, 'delivered').ok).toBe(false)
  })
})
