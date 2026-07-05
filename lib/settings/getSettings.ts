import { createClient } from '@/lib/supabase/server'
import type { Settings } from './types'
import type { WeeklyHours } from '@/lib/hours/hours'

export async function getSettings(): Promise<Settings> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('restaurant_settings').select('*').single()
  if (error || !data) throw new Error(`getSettings failed: ${error?.message ?? 'no settings row'}`)
  return {
    name: data.name,
    phone: data.phone,
    addressText: data.address_text,
    lat: data.lat,
    lng: data.lng,
    deliveryRadiusM: data.delivery_radius_m,
    deliveryFee: data.delivery_fee,
    freeDeliveryThreshold: data.free_delivery_threshold,
    minOrder: data.min_order,
    hours: data.hours as WeeklyHours,
    prepLeadMinutes: data.prep_lead_minutes,
  }
}
