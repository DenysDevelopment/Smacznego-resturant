import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { OrderStatus, OrderType } from './statusFlow'

export interface AdminOrderItem {
  name: string; qty: number; unit_price: number; line_total: number
  selected_options: { optionName: string }[]
}
export interface AdminOrder {
  id: string; public_token: string; status: OrderStatus; type: OrderType
  customer_name: string; customer_phone: string
  subtotal: number; delivery_fee: number; total: number
  cash_change_from: number | null; notes: string | null
  address_snapshot: { formatted?: string } | null
  scheduled_for: string | null; created_at: string
  order_items: AdminOrderItem[]
}

export const SELECT_COLUMNS =
  'id, public_token, status, type, customer_name, customer_phone, subtotal, delivery_fee, total, cash_change_from, notes, address_snapshot, scheduled_for, created_at, order_items(name, qty, unit_price, line_total, selected_options)'

const TERMINAL: OrderStatus[] = ['delivered', 'picked_up', 'cancelled', 'rejected']

/**
 * Active orders (any age) + today's terminal orders, newest first.
 * Two queries merged in JS — avoids the fragile PostgREST `.or()` with a
 * comma-containing `in.(...)` list (commas collide with the or-parser).
 */
export async function listActiveOrders(): Promise<AdminOrder[]> {
  const admin = createAdminClient()
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)

  const [active, todayDone] = await Promise.all([
    admin.from('orders').select(SELECT_COLUMNS)
      .not('status', 'in', `(${TERMINAL.join(',')})`)
      .order('created_at', { ascending: false }),
    admin.from('orders').select(SELECT_COLUMNS)
      .in('status', TERMINAL)
      .gte('created_at', startOfDay.toISOString())
      .order('created_at', { ascending: false }),
  ])
  if (active.error) throw new Error(`listActiveOrders(active): ${active.error.message}`)
  if (todayDone.error) throw new Error(`listActiveOrders(done): ${todayDone.error.message}`)

  const byId = new Map<string, AdminOrder>()
  for (const row of [...(active.data ?? []), ...(todayDone.data ?? [])] as unknown as AdminOrder[]) {
    byId.set(row.id, row)
  }
  return [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function listCourierQueue(): Promise<AdminOrder[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('orders')
    .select(SELECT_COLUMNS)
    .eq('type', 'delivery')
    .in('status', ['ready', 'out_for_delivery'])
    .order('created_at', { ascending: true })
  if (error) throw new Error(`listCourierQueue: ${error.message}`)
  return (data ?? []) as unknown as AdminOrder[]
}
