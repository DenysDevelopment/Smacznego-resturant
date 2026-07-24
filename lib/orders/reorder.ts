'use server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Of the given dish ids, return those a customer can order right now — the dish
 * still exists, is in stock (is_available) and is not hidden from the site.
 * Used by the "repeat order" button so a guest can't re-add something that has
 * since gone out of stock or been removed.
 */
export async function orderableDishIds(dishIds: string[]): Promise<string[]> {
  const ids = [...new Set(dishIds.filter(Boolean))]
  if (ids.length === 0) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('dishes')
    .select('id')
    .in('id', ids)
    .eq('is_available', true)
    .eq('is_hidden', false)
  return (data ?? []).map((d) => d.id)
}
