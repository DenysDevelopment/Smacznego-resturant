'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasRole } from '@/lib/auth/require'
import { LOCALES, type Locale } from '@/i18n/config'
import { CONTENT_KEY_SET } from './keys'
import type { Json } from '@/lib/supabase/types'

const MAX_LEN = 2000
const LOCS: Locale[] = ['pl', 'uk', 'ru']

export interface ContentEntry {
  key: string
  value: Partial<Record<Locale, string>>
}

export async function saveContent(
  entries: ContentEntry[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await hasRole('staff'))) return { ok: false, error: 'unauthorized' }
  if (!Array.isArray(entries) || entries.length > CONTENT_KEY_SET.size) {
    return { ok: false, error: 'bad_input' }
  }

  const upserts: { key: string; value: Json }[] = []
  const deletes: string[] = []
  for (const entry of entries) {
    if (!CONTENT_KEY_SET.has(entry.key)) return { ok: false, error: `bad_key:${entry.key}` }
    const value: Partial<Record<Locale, string>> = {}
    for (const loc of LOCS) {
      const s = entry.value?.[loc]
      if (typeof s !== 'string' && s !== undefined) return { ok: false, error: 'bad_value' }
      if (s && s.length > MAX_LEN) return { ok: false, error: 'too_long' }
      const trimmed = s?.trim()
      if (trimmed) value[loc] = trimmed
    }
    // all locales empty -> remove the override, JSON default returns
    if (Object.keys(value).length === 0) deletes.push(entry.key)
    else upserts.push({ key: entry.key, value: value as Json })
  }

  const admin = createAdminClient()
  if (upserts.length > 0) {
    const { error } = await admin
      .from('site_content')
      .upsert(upserts.map((u) => ({ ...u, updated_at: new Date().toISOString() })), { onConflict: 'key' })
    if (error) return { ok: false, error: 'db_error' }
  }
  if (deletes.length > 0) {
    const { error } = await admin.from('site_content').delete().in('key', deletes)
    if (error) return { ok: false, error: 'db_error' }
  }

  for (const locale of LOCALES) revalidatePath(`/${locale}`, 'layout')
  return { ok: true }
}
