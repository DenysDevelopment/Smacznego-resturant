import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { ContentOverrides } from './merge'

/**
 * All site_content rows, deduped per request via React cache(). Fail-open:
 * the public site must never break because of the CMS layer.
 */
export const getContentOverrides = cache(async (): Promise<ContentOverrides> => {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('site_content').select('key, value')
    if (error || !data) return {}
    const out: ContentOverrides = {}
    for (const row of data) out[row.key] = (row.value ?? {}) as ContentOverrides[string]
    return out
  } catch {
    return {}
  }
})
