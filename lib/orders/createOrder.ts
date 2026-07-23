'use server'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidateItems } from './revalidate'
import { validateOrderInput, validateSchedule } from './validateInput'
import { orderIpLimiter, clientIpFrom } from '@/lib/auth/rateLimit'
import { newToken } from './token'
import { cartSubtotal } from '@/lib/cart/totals'
import { deliveryFee, orderTotal, meetsMinOrder } from '@/lib/cart/totals'
import { isOpenNow } from '@/lib/hours/hours'
import type { CartItem } from '@/lib/cart/types'
import type { AddressValue } from '@/lib/address/types'
import type { Locale } from '@/i18n/config'
import type { Json } from '@/lib/supabase/types'

export interface CreateOrderInput {
  locale: Locale
  type: 'delivery' | 'pickup'
  name: string
  phone: string
  address: AddressValue | null
  scheduledFor: string | null   // 'YYYY-MM-DDTHH:MM' local wall-clock, or null = ASAP
  notes: string
  cashChangeFrom: number | null
  cart: CartItem[]
}

export async function createOrder(input: CreateOrderInput): Promise<{ token: string } | { error: string }> {
  const ip = clientIpFrom(await headers())
  if (orderIpLimiter.isLimited(ip)) return { error: 'rate_limited' }
  orderIpLimiter.hit(ip)

  const valid = validateOrderInput(input)
  if (!valid.ok) return { error: valid.error }

  const admin = createAdminClient()

  const dishIds = [...new Set(input.cart.map((i) => i.dishId))]
  const { data: dishes, error: dishErr } = await admin
    .from('dishes')
    .select('id, name, base_price, is_available, option_groups(id, options(id, name, price_delta))')
    .in('id', dishIds)
  if (dishErr) return { error: 'load_failed' }

  const rv = revalidateItems(input.cart, (dishes ?? []) as never, input.locale)
  if (!rv.ok) return { error: rv.error }

  const { data: settings } = await admin.from('restaurant_settings').select('*').single()
  if (!settings) return { error: 'no_settings' }

  const subtotal = cartSubtotal(rv.items.map((i) => ({ dishId: i.dishId, name: i.name, unitPrice: i.unitPrice, qty: i.qty, selectedOptions: i.selectedOptions })))
  if (!meetsMinOrder(subtotal, { minOrder: settings.min_order })) return { error: 'below_min_order' }

  if (input.scheduledFor) {
    if (!validateSchedule(input.scheduledFor, settings.hours as never, settings.prep_lead_minutes, new Date())) {
      return { error: 'bad_schedule' }
    }
  } else if (!isOpenNow(settings.hours as never, new Date())) {
    return { error: 'closed' }
  }

  const fee = deliveryFee(subtotal, input.type, { deliveryFee: settings.delivery_fee, freeDeliveryThreshold: settings.free_delivery_threshold })
  const total = orderTotal(subtotal, fee)

  // find-or-create customer by phone; never overwrite an existing customer's
  // name from unauthenticated input — each order snapshots customer_name anyway
  let customerId: string | null = null
  {
    const { data: existing } = await admin
      .from('customers').select('id').eq('phone', input.phone).maybeSingle()
    if (existing) {
      customerId = existing.id
    } else {
      const { data: created } = await admin
        .from('customers')
        .upsert({ phone: input.phone, name: input.name }, { onConflict: 'phone', ignoreDuplicates: true })
        .select('id')
        .maybeSingle()
      customerId = created?.id ?? null
      if (!customerId) {
        // lost a concurrent-insert race: the row exists now, fetch it
        const { data: raced } = await admin
          .from('customers').select('id').eq('phone', input.phone).maybeSingle()
        customerId = raced?.id ?? null
      }
    }
  }

  const token = newToken()
  const { data: order, error: orderErr } = await admin
    .from('orders')
    .insert({
      public_token: token,
      customer_id: customerId,
      customer_name: input.name,
      customer_phone: input.phone,
      type: input.type,
      status: 'pending',
      payment_method: 'cash',
      cash_change_from: input.cashChangeFrom,
      subtotal, delivery_fee: fee, total,
      notes: input.notes || null,
      address_snapshot: (input.type === 'delivery' ? input.address : null) as unknown as Json,
      scheduled_for: input.scheduledFor
        ? new Date(input.scheduledFor).toISOString() // interpreted below via SQL if needed; ISO is acceptable for MVP
        : null,
      language: input.locale,
    })
    .select('id')
    .single()
  if (orderErr || !order) return { error: 'create_failed' }

  const { error: itemsErr } = await admin.from('order_items').insert(
    rv.items.map((i) => ({
      order_id: order.id, dish_id: i.dishId, name: i.name,
      unit_price: i.unitPrice, qty: i.qty, selected_options: i.selectedOptions as unknown as Json, line_total: i.lineTotal,
    })),
  )
  if (itemsErr) return { error: 'items_failed' }

  // audit log (best-effort — never fail a placed order over a log write)
  await admin.from('order_events').insert({ order_id: order.id, status: 'pending' })

  return { token }
}
