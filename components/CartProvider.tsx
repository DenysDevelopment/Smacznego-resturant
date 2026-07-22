'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { Cart, CartItem } from '@/lib/cart/types'
import { cartSubtotal } from '@/lib/cart/totals'
import { itemKey } from '@/lib/cart/itemKey'
import { flyToCart, pulseBadge } from '@/lib/cart/flyToCart'

const STORAGE_KEY = 'smacznego-cart'

interface CartApi {
  items: Cart; count: number; subtotal: number
  addItem(item: CartItem): void
  setQty(key: string, qty: number): void
  removeItem(key: string): void
  clear(): void
  keyOf(item: CartItem): string
  /** Register the cart badge element so add-to-cart animations know where to fly. */
  registerBadge(el: HTMLElement | null): void
  /** Launch the fly-to-cart animation from `source` (falls back to a badge pulse). */
  flyTo(source: HTMLElement | null, imageUrl: string | null): void
}

const CartContext = createContext<CartApi | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Cart>([])
  const badgeRef = useRef<HTMLElement | null>(null)

  const registerBadge = useCallback((el: HTMLElement | null) => { badgeRef.current = el }, [])
  const flyTo = useCallback((source: HTMLElement | null, imageUrl: string | null) => {
    const badge = badgeRef.current
    if (!badge) return
    if (source) flyToCart(source, imageUrl, badge)
    else pulseBadge(badge)
  }, [])

  // hydrate once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch { /* ignore corrupt storage */ }
  }, [])

  // persist on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  function addItem(item: CartItem) {
    setItems((prev) => {
      const key = itemKey(item)
      const existing = prev.find((i) => itemKey(i) === key)
      if (existing) return prev.map((i) => (itemKey(i) === key ? { ...i, qty: i.qty + item.qty } : i))
      return [...prev, item]
    })
  }
  function setQty(key: string, qty: number) {
    setItems((prev) =>
      qty <= 0 ? prev.filter((i) => itemKey(i) !== key) : prev.map((i) => (itemKey(i) === key ? { ...i, qty } : i)),
    )
  }
  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => itemKey(i) !== key))
  }
  function clear() { setItems([]) }

  const count = items.reduce((n, i) => n + i.qty, 0)
  const subtotal = cartSubtotal(items)

  return (
    <CartContext.Provider value={{ items, count, subtotal, addItem, setQty, removeItem, clear, keyOf: itemKey, registerBadge, flyTo }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
