'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { OrderStatus, OrderType } from './statusFlow'
import type { SelectedOption } from '@/lib/cart/types'

export interface OrderSummaryItem {
  dishId: string | null
  name: string
  unitPrice: number
  qty: number
  selectedOptions: SelectedOption[]
}
export interface OrderSummary {
  token: string
  status: OrderStatus
  type: OrderType
  total: number
  createdAt: string
  items: OrderSummaryItem[]
}

/**
 * Public summaries for a set of order tokens (the token is the capability —
 * same as the order page). Powers the customer "Заказы" menu: current order,
 * history, and one-tap reorder. Unknown tokens are simply omitted.
 */
export async function getOrdersSummary(tokens: string[]): Promise<OrderSummary[]> {
  const clean = (tokens ?? []).filter((t) => typeof t === 'string' && t.length > 0 && t.length <= 64).slice(0, 20)
  if (clean.length === 0) return []

  const admin = createAdminClient()
  const { data } = await admin
    .from('orders')
    .select('public_token, status, type, total, created_at, order_items(dish_id, name, unit_price, qty, selected_options)')
    .in('public_token', clean)
  if (!data) return []

  return data
    .map((o) => ({
      token: o.public_token,
      status: o.status as OrderStatus,
      type: o.type as OrderType,
      total: o.total,
      createdAt: o.created_at,
      items: ((o.order_items ?? []) as { dish_id: string | null; name: string; unit_price: number; qty: number; selected_options: unknown }[]).map((i) => ({
        dishId: i.dish_id,
        name: i.name,
        unitPrice: i.unit_price,
        qty: i.qty,
        selectedOptions: Array.isArray(i.selected_options) ? (i.selected_options as SelectedOption[]) : [],
      })),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
