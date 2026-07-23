import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type FlagGroup = 'step' | 'text'
export interface FlagDef { key: string; label: string; group: FlagGroup }

// Toggleable storefront elements. Only these keys are accepted by saveFlags.
// Order-flow start (pending) and end (delivered/picked_up) are always shown.
export const FLAG_DEFS: FlagDef[] = [
  { key: 'step.confirmed', label: 'Этап «Подтверждён»', group: 'step' },
  { key: 'step.preparing', label: 'Этап «Готовится»', group: 'step' },
  { key: 'step.ready', label: 'Этап «Готов»', group: 'step' },
  { key: 'step.out_for_delivery', label: 'Этап «Курьер в пути» (доставка)', group: 'step' },
  { key: 'text.confirmedSub', label: 'Подзаголовок «Скоро позвоним…»', group: 'text' },
  { key: 'text.liveNote', label: 'Пометка «Статус обновляется автоматически»', group: 'text' },
]

export const FLAG_KEY_SET = new Set(FLAG_DEFS.map((f) => f.key))

export type Flags = Record<string, boolean>

/** All flags as key→enabled. Missing keys are enabled by default. Fail-open. */
export const getFlags = cache(async (): Promise<Flags> => {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('site_flags').select('key, enabled')
    if (error || !data) return {}
    const out: Flags = {}
    for (const r of data) out[r.key] = r.enabled
    return out
  } catch {
    return {}
  }
})

/** A flag is on unless explicitly stored as disabled. */
export function flagEnabled(flags: Flags, key: string): boolean {
  return flags[key] !== false
}
