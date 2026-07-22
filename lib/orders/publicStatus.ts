'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { OrderStatus, OrderType } from './statusFlow'

/**
 * Public order status by token (the token is the capability — same as the
 * order page). Used by the header "my order" pill. Returns null if unknown.
 */
export async function getPublicOrderStatus(
  token: string,
): Promise<{ status: OrderStatus; type: OrderType } | null> {
  if (!token || token.length > 64) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from('orders')
    .select('status, type')
    .eq('public_token', token)
    .maybeSingle()
  if (!data) return null
  return { status: data.status as OrderStatus, type: data.type as OrderType }
}
