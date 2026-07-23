'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasRole } from '@/lib/auth/require'
import type { OrderStatus, OrderType } from './statusFlow'
import type { AddressValue } from '@/lib/address/types'

export interface OrderDetailItem {
  name: string
  qty: number
  unit_price: number
  line_total: number
  selected_options: { optionName: string }[]
}
export interface OrderEventRow { status: OrderStatus; created_at: string }

export interface OrderDetail {
  id: string
  public_token: string
  status: OrderStatus
  type: OrderType
  customer_name: string
  customer_phone: string
  address: AddressValue | null
  notes: string | null
  payment_method: string
  cash_change_from: number | null
  scheduled_for: string | null
  subtotal: number
  delivery_fee: number
  total: number
  created_at: string
  items: OrderDetailItem[]
  events: OrderEventRow[]
}

export async function getOrderDetail(orderId: string): Promise<{ ok: true; order: OrderDetail } | { ok: false; error: string }> {
  if (!(await hasRole('staff'))) return { ok: false, error: 'unauthorized' }
  const admin = createAdminClient()

  const { data: order, error } = await admin
    .from('orders')
    .select('id, public_token, status, type, customer_name, customer_phone, address_snapshot, notes, payment_method, cash_change_from, scheduled_for, subtotal, delivery_fee, total, created_at, order_items(name, qty, unit_price, line_total, selected_options)')
    .eq('id', orderId)
    .maybeSingle()
  if (error) return { ok: false, error: 'db_error' }
  if (!order) return { ok: false, error: 'not_found' }

  const { data: events } = await admin
    .from('order_events')
    .select('status, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  const o = order as unknown as {
    id: string; public_token: string; status: OrderStatus; type: OrderType
    customer_name: string; customer_phone: string
    address_snapshot: AddressValue | null; notes: string | null
    payment_method: string; cash_change_from: number | null; scheduled_for: string | null
    subtotal: number; delivery_fee: number; total: number; created_at: string
    order_items: OrderDetailItem[]
  }

  return {
    ok: true,
    order: {
      id: o.id,
      public_token: o.public_token,
      status: o.status,
      type: o.type,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      address: o.address_snapshot,
      notes: o.notes,
      payment_method: o.payment_method,
      cash_change_from: o.cash_change_from,
      scheduled_for: o.scheduled_for,
      subtotal: o.subtotal,
      delivery_fee: o.delivery_fee,
      total: o.total,
      created_at: o.created_at,
      items: o.order_items ?? [],
      events: (events ?? []) as OrderEventRow[],
    },
  }
}
