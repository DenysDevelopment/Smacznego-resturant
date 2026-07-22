'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasRole } from '@/lib/auth/require'
import { LOCALES } from '@/i18n/config'
import { FLAG_KEY_SET } from './flags'

export interface FlagEntry { key: string; enabled: boolean }

export async function saveFlags(entries: FlagEntry[]): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await hasRole('staff'))) return { ok: false, error: 'unauthorized' }
  if (!Array.isArray(entries) || entries.length > FLAG_KEY_SET.size) return { ok: false, error: 'bad_input' }
  for (const e of entries) {
    if (!FLAG_KEY_SET.has(e.key) || typeof e.enabled !== 'boolean') return { ok: false, error: `bad_key:${e.key}` }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('site_flags')
    .upsert(entries.map((e) => ({ key: e.key, enabled: e.enabled, updated_at: new Date().toISOString() })), { onConflict: 'key' })
  if (error) return { ok: false, error: 'db_error' }

  // order pages render flags server-side
  for (const locale of LOCALES) revalidatePath(`/${locale}`, 'layout')
  return { ok: true }
}
