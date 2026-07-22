'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/session'
import { guardTransition } from './guard'
import type { OrderStatus, OrderType } from './statusFlow'

export async function updateOrderStatus(
  orderId: string,
  to: OrderStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // The user may hold a staff and/or courier session (separate cookies).
  // Authorize the transition if any held role permits it.
  const sessions = (await Promise.all([getSession('staff'), getSession('courier')])).filter(Boolean)
  if (sessions.length === 0) return { ok: false, error: 'unauthorized' }

  const admin = createAdminClient()
  const { data: order, error: loadErr } = await admin
    .from('orders').select('type, status').eq('id', orderId).single()
  if (loadErr || !order) return { ok: false, error: 'not_found' }

  const orderRef = order as { type: OrderType; status: OrderStatus }
  let guard: { ok: true } | { ok: false; error: string } = { ok: false, error: 'forbidden_for_role' }
  for (const session of sessions) {
    guard = guardTransition(session, orderRef, to)
    if (guard.ok) break
  }
  if (!guard.ok) return guard

  const { error: updErr } = await admin.from('orders').update({ status: to }).eq('id', orderId)
  if (updErr) return { ok: false, error: 'update_failed' }

  // audit log (best-effort)
  await admin.from('order_events').insert({ order_id: orderId, status: to })

  revalidatePath('/admin')
  revalidatePath('/courier')
  return { ok: true }
}
