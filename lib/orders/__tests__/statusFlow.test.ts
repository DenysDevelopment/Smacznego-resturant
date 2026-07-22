import { describe, it, expect } from 'vitest'
import { canTransition, operatorActions, courierActions, isCourierVisible } from '../statusFlow'

describe('canTransition', () => {
  it('allows pending -> confirmed / rejected', () => {
    expect(canTransition('delivery', 'pending', 'confirmed')).toBe(true)
    expect(canTransition('delivery', 'pending', 'rejected')).toBe(true)
  })
  it('delivery ready -> out_for_delivery, pickup ready -> picked_up', () => {
    expect(canTransition('delivery', 'ready', 'out_for_delivery')).toBe(true)
    expect(canTransition('delivery', 'ready', 'picked_up')).toBe(false)
    expect(canTransition('pickup', 'ready', 'picked_up')).toBe(true)
    expect(canTransition('pickup', 'ready', 'out_for_delivery')).toBe(false)
  })
  it('blocks skips and transitions out of terminal states', () => {
    expect(canTransition('delivery', 'pending', 'delivered')).toBe(false)
    expect(canTransition('delivery', 'delivered', 'ready')).toBe(false)
  })
})

describe('operatorActions', () => {
  it('offers accept/reject on pending', () => {
    expect(operatorActions('delivery', 'pending').map((a) => a.to)).toEqual(['confirmed', 'rejected'])
  })
  it('delivery ready has no operator advance (courier takes over), still cancellable', () => {
    expect(operatorActions('delivery', 'ready').map((a) => a.to)).toEqual(['cancelled'])
  })
  it('pickup ready can be marked picked_up', () => {
    expect(operatorActions('pickup', 'ready').map((a) => a.to)).toContain('picked_up')
  })
})

describe('courierActions', () => {
  it('ready -> забрал, out_for_delivery -> доставлен', () => {
    expect(courierActions('ready').map((a) => a.to)).toEqual(['out_for_delivery'])
    expect(courierActions('out_for_delivery').map((a) => a.to)).toEqual(['delivered'])
    expect(courierActions('delivered')).toEqual([])
  })
})

describe('isCourierVisible', () => {
  it('shows delivery orders that are ready or out for delivery', () => {
    expect(isCourierVisible({ type: 'delivery', status: 'ready' })).toBe(true)
    expect(isCourierVisible({ type: 'delivery', status: 'out_for_delivery' })).toBe(true)
  })
  it('hides pickup and non-active-delivery statuses', () => {
    expect(isCourierVisible({ type: 'pickup', status: 'ready' })).toBe(false)
    expect(isCourierVisible({ type: 'delivery', status: 'preparing' })).toBe(false)
    expect(isCourierVisible({ type: 'delivery', status: 'delivered' })).toBe(false)
  })
})
