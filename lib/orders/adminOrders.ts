import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasRole } from '@/lib/auth/require'
import { warsawStartOfDayUtc } from '@/lib/time/warsaw'
import type { OrderStatus, OrderType } from './statusFlow'

export interface AdminOrderItem {
  name: string; qty: number; unit_price: number; line_total: number
  selected_options: { optionName: string }[]
}
export interface AdminOrder {
  id: string; public_token: string; status: OrderStatus; type: OrderType
  customer_name: string; customer_phone: string
  subtotal: number; delivery_fee: number; total: number
  payment_method: string; cash_change_from: number | null; notes: string | null
  address_snapshot: { formatted?: string } | null
  scheduled_for: string | null; created_at: string
  order_items: AdminOrderItem[]
}

export const SELECT_COLUMNS =
  'id, public_token, status, type, customer_name, customer_phone, subtotal, delivery_fee, total, payment_method, cash_change_from, notes, address_snapshot, scheduled_for, created_at, order_items(name, qty, unit_price, line_total, selected_options)'

const TERMINAL: OrderStatus[] = ['delivered', 'picked_up', 'cancelled', 'rejected']

/**
 * Active orders (any age) + today's terminal orders, newest first.
 * Two queries merged in JS — avoids the fragile PostgREST `.or()` with a
 * comma-containing `in.(...)` list (commas collide with the or-parser).
 */
export async function listActiveOrders(): Promise<AdminOrder[]> {
  // defense in depth: pages redirect via requireRole, this is the backstop
  if (!(await hasRole('staff'))) throw new Error('unauthorized')
  const admin = createAdminClient()
  // "Завершены" shows only today's finished orders and resets at 00:00 Warsaw
  const startOfDay = warsawStartOfDayUtc(new Date())

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

export interface OrderLogRow {
  id: string
  public_token: string
  status: OrderStatus
  type: OrderType
  customer_name: string
  customer_phone: string
  total: number
  created_at: string           // placed
  accepted_at: string | null   // first time it was accepted (confirmed)
  finished_at: string | null   // delivered / picked up time
  delivered: boolean           // finished successfully vs cancelled/rejected/in-progress
}

/**
 * Full order history for /admin/logs, newest first, capped at 500.
 * `from`/`to` are UTC ISO instants (half-open [from, to)). Accepted/finished
 * times come from the order_events audit log (null for pre-log orders).
 */
export async function listOrderLog(filter?: { from?: string; to?: string }): Promise<OrderLogRow[]> {
  if (!(await hasRole('staff'))) throw new Error('unauthorized')
  const admin = createAdminClient()

  let q = admin
    .from('orders')
    .select('id, public_token, status, type, customer_name, customer_phone, total, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  if (filter?.from) q = q.gte('created_at', filter.from)
  if (filter?.to) q = q.lt('created_at', filter.to)
  const { data: orders, error } = await q
  if (error) throw new Error(`listOrderLog: ${error.message}`)

  const ids = (orders ?? []).map((o) => o.id)
  const events = ids.length
    ? (await admin.from('order_events').select('order_id, status, created_at').in('order_id', ids)).data ?? []
    : []

  const earliest = (map: Map<string, string>, orderId: string, at: string) => {
    const cur = map.get(orderId)
    if (!cur || at < cur) map.set(orderId, at)
  }
  const acceptedAt = new Map<string, string>()
  const finishedAt = new Map<string, string>()
  for (const e of events) {
    if (e.status === 'confirmed') earliest(acceptedAt, e.order_id, e.created_at)
    if (e.status === 'delivered' || e.status === 'picked_up') earliest(finishedAt, e.order_id, e.created_at)
  }

  return (orders ?? []).map((o) => ({
    id: o.id,
    public_token: o.public_token,
    status: o.status as OrderStatus,
    type: o.type as OrderType,
    customer_name: o.customer_name,
    customer_phone: o.customer_phone,
    total: o.total,
    created_at: o.created_at,
    accepted_at: acceptedAt.get(o.id) ?? null,
    finished_at: finishedAt.get(o.id) ?? null,
    delivered: o.status === 'delivered' || o.status === 'picked_up',
  }))
}

export async function listCourierQueue(): Promise<AdminOrder[]> {
  if (!(await hasRole('courier'))) throw new Error('unauthorized')
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
