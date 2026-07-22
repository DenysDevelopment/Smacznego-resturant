import { describe, it, expect } from 'vitest'
import { orderProgress } from '@/lib/orders/progress'

describe('orderProgress', () => {
  it('delivery flow marks done/current/todo around the current status', () => {
    const p = orderProgress('delivery', 'preparing')
    expect(p.kind).toBe('flow')
    if (p.kind !== 'flow') return
    expect(p.steps.map((s) => s.key)).toEqual(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'])
    expect(p.steps.find((s) => s.key === 'pending')!.state).toBe('done')
    expect(p.steps.find((s) => s.key === 'confirmed')!.state).toBe('done')
    expect(p.steps.find((s) => s.key === 'preparing')!.state).toBe('current')
    expect(p.steps.find((s) => s.key === 'ready')!.state).toBe('todo')
    expect(p.steps.find((s) => s.key === 'delivered')!.state).toBe('todo')
  })

  it('pickup flow uses picked_up instead of delivery steps', () => {
    const p = orderProgress('pickup', 'ready')
    if (p.kind !== 'flow') throw new Error('expected flow')
    expect(p.steps.map((s) => s.key)).toEqual(['pending', 'confirmed', 'preparing', 'ready', 'picked_up'])
    expect(p.steps.find((s) => s.key === 'ready')!.state).toBe('current')
    expect(p.steps.find((s) => s.key === 'picked_up')!.state).toBe('todo')
  })

  it('final delivered status marks all steps done', () => {
    const p = orderProgress('delivery', 'delivered')
    if (p.kind !== 'flow') throw new Error('expected flow')
    expect(p.steps.every((s) => s.state === 'done' || s.state === 'current')).toBe(true)
    expect(p.steps.find((s) => s.key === 'delivered')!.state).toBe('current')
  })

  it('cancelled / rejected are a failed marker, not a flow', () => {
    expect(orderProgress('delivery', 'cancelled')).toEqual({ kind: 'failed', status: 'cancelled' })
    expect(orderProgress('pickup', 'rejected')).toEqual({ kind: 'failed', status: 'rejected' })
  })

  it('hidden steps are removed from the display but first/last always stay', () => {
    const p = orderProgress('delivery', 'ready', new Set(['confirmed', 'out_for_delivery']))
    if (p.kind !== 'flow') throw new Error('expected flow')
    expect(p.steps.map((s) => s.key)).toEqual(['pending', 'preparing', 'ready', 'delivered'])
  })

  it('a hidden current step collapses onto the previous visible step', () => {
    // order is at "confirmed" but that step is hidden → "pending" shows as current
    const p = orderProgress('delivery', 'confirmed', new Set(['confirmed']))
    if (p.kind !== 'flow') throw new Error('expected flow')
    expect(p.steps.find((s) => s.key === 'pending')!.state).toBe('current')
    expect(p.steps.find((s) => s.key === 'preparing')!.state).toBe('todo')
  })
})
