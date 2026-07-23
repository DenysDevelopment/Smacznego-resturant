'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasRole } from '@/lib/auth/require'
import { LOCALES } from '@/i18n/config'
import { validateSettingsInput, type SettingsInput } from './validate'
import type { Json } from '@/lib/supabase/types'

export async function updateSettings(
  input: SettingsInput,
): Promise<{ ok: true } | { ok: false; error: string; field?: string }> {
  if (!(await hasRole('staff'))) return { ok: false, error: 'unauthorized' }
  const valid = validateSettingsInput(input)
  if (!valid.ok) return valid

  const admin = createAdminClient()
  const { error } = await admin
    .from('restaurant_settings')
    .update({
      name: input.name.trim(),
      phone: input.phone.trim(),
      address_text: input.addressText.trim(),
      lat: input.lat,
      lng: input.lng,
      delivery_radius_m: input.deliveryRadiusM,
      delivery_fee: input.deliveryFee,
      free_delivery_threshold: input.freeDeliveryThreshold,
      min_order: input.minOrder,
      hours: input.hours as unknown as Json,
      prep_lead_minutes: input.prepLeadMinutes,
    })
    .eq('id', true)
  if (error) return { ok: false, error: 'db_error' }

  // settings feed the locale layout (SettingsProvider), homepage, footer, checkout
  for (const locale of LOCALES) revalidatePath(`/${locale}`, 'layout')
  return { ok: true }
}
