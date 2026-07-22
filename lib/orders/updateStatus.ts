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
  const session = await getSession()
  if (!session) return { ok: false, error: 'unauthorized' }

  const admin = createAdminClient()
  const { data: order, error: loadErr } = await admin
    .from('orders').select('type, status').eq('id', orderId).single()
  if (loadErr || !order) return { ok: false, error: 'not_found' }

  const guard = guardTransition(session, order as { type: OrderType; status: OrderStatus }, to)
  if (!guard.ok) return guard

  const { error: updErr } = await admin.from('orders').update({ status: to }).eq('id', orderId)
  if (updErr) return { ok: false, error: 'update_failed' }

  revalidatePath('/admin')
  revalidatePath('/courier')
  return { ok: true }
}
