// Pure merge of DB content overrides into the next-intl messages tree.
import type { Locale } from '@/i18n/config'

export type ContentOverrides = Record<string, Partial<Record<Locale, string>>>
type Messages = Record<string, unknown>

/**
 * For each override key (dot-path), replace the message leaf when the
 * override has a non-empty string for `locale` — otherwise the static JSON
 * value stays (mirrors localize(): empty locale falls back). Unknown paths
 * are ignored. The input tree is not mutated.
 */
export function mergeMessages(messages: Messages, overrides: ContentOverrides, locale: Locale): Messages {
  const entries = Object.entries(overrides).filter(([, value]) => {
    const s = value?.[locale]
    return typeof s === 'string' && s.trim().length > 0
  })
  if (entries.length === 0) return messages

  const out = structuredClone(messages)
  for (const [key, value] of entries) {
    const path = key.split('.')
    let node: Record<string, unknown> = out
    let ok = true
    for (let i = 0; i < path.length - 1; i++) {
      const next = node[path[i]]
      if (typeof next !== 'object' || next === null || Array.isArray(next)) { ok = false; break }
      node = next as Record<string, unknown>
    }
    const leaf = path[path.length - 1]
    if (ok && typeof node[leaf] === 'string') {
      node[leaf] = (value[locale] as string).trim()
    }
  }
  return out
}
