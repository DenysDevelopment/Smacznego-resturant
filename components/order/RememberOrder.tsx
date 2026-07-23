'use client'
import { useEffect } from 'react'
import { rememberOrder } from '@/lib/orders/recentOrders'

/** Persists the order token so the site can link back to it later. Renders nothing. */
export function RememberOrder({ token }: { token: string }) {
  useEffect(() => {
    rememberOrder(token)
  }, [token])
  return null
}
