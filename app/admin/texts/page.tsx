import { requireRole } from '@/lib/auth/require'
import { createAdminClient } from '@/lib/supabase/admin'
import { CONTENT_KEYS } from '@/lib/content/keys'
import { FLAG_DEFS, getFlags, flagEnabled } from '@/lib/content/flags'
import { ContentForm, type ContentFormItem } from '@/components/admin/texts/ContentForm'
import { FlagsForm } from '@/components/admin/texts/FlagsForm'
import pl from '@/messages/pl.json'
import uk from '@/messages/uk.json'
import ru from '@/messages/ru.json'
import type { Locale } from '@/i18n/config'

export const dynamic = 'force-dynamic'

function leafAt(tree: unknown, dotPath: string): string | undefined {
  let node: unknown = tree
  for (const part of dotPath.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' ? node : undefined
}

export default async function AdminTextsPage() {
  await requireRole('staff')
  const admin = createAdminClient()
  const { data } = await admin.from('site_content').select('key, value')
  const overrides = new Map((data ?? []).map((row) => [row.key, row.value as Partial<Record<Locale, string>>]))

  const flags = await getFlags()
  const flagItems = FLAG_DEFS.map((f) => ({ ...f, enabled: flagEnabled(flags, f.key) }))

  const items: ContentFormItem[] = CONTENT_KEYS.map((k) => ({
    key: k.key,
    label: k.label,
    multiline: k.multiline,
    section: k.section,
    defaults: {
      pl: leafAt(pl, k.key),
      uk: leafAt(uk, k.key),
      ru: leafAt(ru, k.key),
    },
    value: overrides.get(k.key) ?? {},
  }))

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">Тексты</h1>
      <ContentForm items={items} />
      <FlagsForm initial={flagItems} />
    </main>
  )
}
