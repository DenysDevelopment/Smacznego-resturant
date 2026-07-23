'use client'
import { useState } from 'react'
import { translateText } from '@/lib/translate/actions'
import { showCenterToast } from '@/components/CenterToast'
import type { I18nText } from '@/lib/menu/admin/validate'
import type { Locale } from '@/i18n/config'

const LOCS = ['pl', 'uk', 'ru'] as const
const LABELS: Record<(typeof LOCS)[number], string> = { pl: 'PL', uk: 'UA', ru: 'RU' }

// Shown as a small centered toast when auto-translate fails (API quota, DeepL down, etc.)
const TR_ERRORS: Record<string, string> = {
  unauthorized: 'Нет доступа к переводчику',
  not_configured: 'Переводчик DeepL не настроен',
  empty: 'Сначала введите текст',
  quota: 'Лимит переводчика DeepL исчерпан',
  api_error: 'Переводчик недоступен. Попробуйте позже',
  network: 'Нет связи с переводчиком',
}

export function I18nField({
  label, value, onChange, multiline = false, error, placeholders,
}: {
  label: string
  value: I18nText
  onChange: (v: I18nText) => void
  multiline?: boolean
  error?: string
  /** per-locale placeholder (e.g. current JSON default); falls back to the required/optional hint */
  placeholders?: I18nText
}) {
  const [tab, setTab] = useState<(typeof LOCS)[number]>('pl')
  const [translating, setTranslating] = useState(false)
  const placeholder =
    placeholders?.[tab] ?? (tab === 'pl' ? 'Обязательно' : 'Необязательно (фолбэк на PL)')
  const inputCls =
    'w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-beet'

  const current = (value[tab] ?? '').trim()

  async function translate() {
    if (!current) {
      showCenterToast(TR_ERRORS.empty, 'info')
      return
    }
    const targets = LOCS.filter((l) => l !== tab) as Locale[]
    setTranslating(true)
    const res = await translateText(current, tab as Locale, targets)
    setTranslating(false)
    if (!res.ok) {
      showCenterToast(TR_ERRORS[res.error] ?? 'Не удалось перевести')
      return
    }
    onChange({ ...value, ...res.translations })
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
        <div className="flex items-center gap-0.5">
          {LOCS.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setTab(loc)}
              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                tab === loc ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
              }`}
            >
              {LABELS[loc]}
              {loc === 'pl' && <span className="text-beet">*</span>}
            </button>
          ))}
          <button
            type="button"
            onClick={translate}
            disabled={translating}
            title={`Перевести текст из вкладки ${LABELS[tab]} на остальные языки через DeepL. Заполненные поля будут перезаписаны.`}
            aria-label="Автоперевод через DeepL"
            className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-beet/10 hover:text-beet disabled:opacity-50"
          >
            {translating ? (
              <svg viewBox="0 0 24 24" width={15} height={15} className="animate-spin" fill="none" stroke="currentColor" strokeWidth={2.4}>
                <path d="M21 12a9 9 0 1 1-6.2-8.6" strokeLinecap="round" />
              </svg>
            ) : (
              // translate glyph (文/A)
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5h7M8 3v2c0 4-2 7-5 8" />
                <path d="M5 10c0 2 2.5 4 6 4.5" />
                <path d="M12 20l4-9 4 9M13.5 17h5" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {multiline ? (
        <textarea
          rows={2}
          value={value[tab] ?? ''}
          onChange={(e) => onChange({ ...value, [tab]: e.target.value })}
          className={`${inputCls} resize-none`}
          placeholder={placeholder}
        />
      ) : (
        <input
          value={value[tab] ?? ''}
          onChange={(e) => onChange({ ...value, [tab]: e.target.value })}
          className={inputCls}
          placeholder={placeholder}
        />
      )}
      {error && <p className="mt-1 text-xs font-semibold text-brick">{error}</p>}
    </div>
  )
}
