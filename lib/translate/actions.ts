'use server'
import { hasRole } from '@/lib/auth/require'
import type { Locale } from '@/i18n/config'

// next-intl locale -> DeepL language code
const DEEPL_LANG: Record<Locale, string> = { pl: 'PL', uk: 'UK', ru: 'RU' }

export type TranslateResult =
  | { ok: true; translations: Partial<Record<Locale, string>> }
  | { ok: false; error: 'unauthorized' | 'not_configured' | 'empty' | 'quota' | 'api_error' | 'network' }

/**
 * Translate `text` (written in `from`) into each of `targets` via DeepL.
 * Staff-only and server-side — the DeepL key never reaches the client.
 */
export async function translateText(
  text: string,
  from: Locale,
  targets: Locale[],
): Promise<TranslateResult> {
  if (!(await hasRole('staff'))) return { ok: false, error: 'unauthorized' }
  const key = process.env.DEEPL_API_KEY
  if (!key) return { ok: false, error: 'not_configured' }
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, error: 'empty' }

  // free keys end in ':fx'
  const base = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com'
  const out: Partial<Record<Locale, string>> = {}

  try {
    for (const target of targets) {
      if (target === from) continue
      const params = new URLSearchParams()
      params.append('text', trimmed)
      params.append('source_lang', DEEPL_LANG[from])
      params.append('target_lang', DEEPL_LANG[target])
      const res = await fetch(`${base}/v2/translate`, {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${key}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
        cache: 'no-store',
      })
      if (!res.ok) return { ok: false, error: res.status === 456 ? 'quota' : 'api_error' }
      const data = (await res.json()) as { translations?: { text: string }[] }
      const translated = data.translations?.[0]?.text
      if (typeof translated === 'string') out[target] = translated
    }
    return { ok: true, translations: out }
  } catch {
    return { ok: false, error: 'network' }
  }
}
