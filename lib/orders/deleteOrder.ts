'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasRole } from '@/lib/auth/require'

/**
 * Permanently delete an order. order_items and order_events are removed by the
 * `on delete cascade` FKs. Staff-only — a courier can move an order but not
 * erase it. Unlike cancel/reject (which keep the row for the history), this is
 * irreversible and leaves no trace in /admin/logs.
 */
export async function deleteOrder(orderId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await hasRole('staff'))) return { ok: false, error: 'unauthorized' }
  const admin = createAdminClient()
  const { error } = await admin.from('orders').delete().eq('id', orderId)
  if (error) return { ok: false, error: 'delete_failed' }
  revalidatePath('/admin')
  revalidatePath('/courier')
  revalidatePath('/admin/logs')
  return { ok: true }
}
