import { describe, it, expect } from 'vitest'
import { lineTotal, cartSubtotal, deliveryFee, amountToFreeDelivery, meetsMinOrder, orderTotal } from '@/lib/cart/totals'
import type { Cart } from '@/lib/cart/types'

const cart: Cart = [
  { dishId: 'd1', name: 'Barszcz', unitPrice: 3500, qty: 2, selectedOptions: [] },
  { dishId: 'd2', name: 'Pierogi', unitPrice: 2400, qty: 1, selectedOptions: [] },
]
const settings = { deliveryFee: 800, freeDeliveryThreshold: 6000, minOrder: 3000 }

describe('cart totals', () => {
  it('lineTotal multiplies unit price by qty', () => {
    expect(lineTotal(cart[0])).toBe(7000)
  })
  it('cartSubtotal sums line totals', () => {
    expect(cartSubtotal(cart)).toBe(9400)
  })
  it('deliveryFee is 0 for pickup', () => {
    expect(deliveryFee(2000, 'pickup', settings)).toBe(0)
  })
  it('deliveryFee is charged below threshold for delivery', () => {
    expect(deliveryFee(5000, 'delivery', settings)).toBe(800)
  })
  it('deliveryFee is free at/above threshold', () => {
    expect(deliveryFee(6000, 'delivery', settings)).toBe(0)
  })
  it('amountToFreeDelivery counts down and floors at 0', () => {
    expect(amountToFreeDelivery(5000, settings)).toBe(1000)
    expect(amountToFreeDelivery(6000, settings)).toBe(0)
  })
  it('meetsMinOrder checks the threshold', () => {
    expect(meetsMinOrder(2999, settings)).toBe(false)
    expect(meetsMinOrder(3000, settings)).toBe(true)
  })
  it('orderTotal adds fee to subtotal', () => {
    expect(orderTotal(9400, 800)).toBe(10200)
  })
})
