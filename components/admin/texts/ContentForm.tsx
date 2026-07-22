'use client'
import { useState } from 'react'
import { saveContent } from '@/lib/content/actions'
import { useSaveRegistration, eqI18n, type SaveResult } from '@/components/admin/SaveBar'
import { I18nField } from '@/components/admin/menu/I18nField'
import { SECTION_LABELS, type ContentSection } from '@/lib/content/keys'
import type { I18nText } from '@/lib/menu/admin/validate'

export interface ContentFormItem {
  key: string
  label: string
  multiline: boolean
  section: ContentSection
  /** current static JSON values per locale (shown as placeholders) */
  defaults: I18nText
  /** current DB override (empty object = none) */
  value: I18nText
}

const SECTION_ORDER: ContentSection[] = ['hero', 'about', 'delivery', 'contact', 'footer', 'order']

export function ContentForm({ items }: { items: ContentFormItem[] }) {
  const [values, setValues] = useState<Record<string, I18nText>>(
    () => Object.fromEntries(items.map((i) => [i.key, i.value])),
  )

  const dirty = items.some((i) => !eqI18n(values[i.key] ?? {}, i.value))

  async function save(): Promise<SaveResult> {
    const res = await saveContent(items.map((i) => ({ key: i.key, value: values[i.key] ?? {} })))
    if (!res.ok) {
      return { ok: false, error: res.error === 'unauthorized' ? 'Нет доступа' : 'Тексты: не удалось сохранить' }
    }
    return { ok: true }
  }

  useSaveRegistration('texts', dirty, save)

  return (
    <div className="space-y-8">
      <p className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm text-muted">
        Пустое поле = используется стандартный текст (показан как подсказка). Кнопка «Сбросить»
        возвращает стандартный текст для всех языков.
      </p>

      {SECTION_ORDER.map((section) => {
        const sectionItems = items.filter((i) => i.section === section)
        if (sectionItems.length === 0) return null
        return (
          <section key={section}>
            <h2 className="mb-3 text-xl font-extrabold tracking-tight">{SECTION_LABELS[section]}</h2>
            <div className="space-y-4 rounded-2xl border border-line bg-panel/50 p-5">
              {sectionItems.map((item) => {
                const hasOverride = Object.values(values[item.key] ?? {}).some((v) => v?.trim())
                return (
                  <div key={item.key} className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <I18nField
                        label={item.label}
                        value={values[item.key] ?? {}}
                        onChange={(v) => setValues((prev) => ({ ...prev, [item.key]: v }))}
                        multiline={item.multiline}
                        placeholders={item.defaults}
                      />
                    </div>
                    {hasOverride && (
                      <button
                        type="button"
                        onClick={() => setValues((prev) => ({ ...prev, [item.key]: {} }))}
                        className="mt-6 shrink-0 rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted hover:bg-ink hover:text-paper"
                      >
                        Сбросить
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

    </div>
  )
}
