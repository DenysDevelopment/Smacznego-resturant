'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import type { Cart, CartItem } from '@/lib/cart/types'
import { cartSubtotal } from '@/lib/cart/totals'
import { itemKey } from '@/lib/cart/itemKey'

const STORAGE_KEY = 'smacznego-cart'

interface CartApi {
  items: Cart; count: number; subtotal: number
  addItem(item: CartItem): void
  setQty(key: string, qty: number): void
  removeItem(key: string): void
  clear(): void
  keyOf(item: CartItem): string
}

const CartContext = createContext<CartApi | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Cart>([])

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
    <CartContext.Provider value={{ items, count, subtotal, addItem, setQty, removeItem, clear, keyOf: itemKey }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
