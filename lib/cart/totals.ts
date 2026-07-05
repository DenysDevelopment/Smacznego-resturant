import type { Cart, CartItem } from './types'

export function lineTotal(item: CartItem): number {
  return item.unitPrice * item.qty
}
export function cartSubtotal(cart: Cart): number {
  return cart.reduce((sum, item) => sum + lineTotal(item), 0)
}
export function deliveryFee(
  subtotal: number,
  type: 'delivery' | 'pickup',
  settings: { deliveryFee: number; freeDeliveryThreshold: number },
): number {
  if (type === 'pickup') return 0
  return subtotal >= settings.freeDeliveryThreshold ? 0 : settings.deliveryFee
}
export function amountToFreeDelivery(subtotal: number, settings: { freeDeliveryThreshold: number }): number {
  return Math.max(0, settings.freeDeliveryThreshold - subtotal)
}
export function meetsMinOrder(subtotal: number, settings: { minOrder: number }): boolean {
  return subtotal >= settings.minOrder
}
export function orderTotal(subtotal: number, fee: number): number {
  return subtotal + fee
}
