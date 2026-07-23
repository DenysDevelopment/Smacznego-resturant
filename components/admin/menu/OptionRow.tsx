'use client'
import { useState } from 'react'
import { upsertOption } from '@/lib/menu/admin/actions'
import { parseZlotyToGrosze, formatGroszeToZlotyInput } from '@/lib/menu/admin/money'
import { useSaveRegistration, eqI18n, type SaveResult } from '@/components/admin/SaveBar'
import { I18nField } from './I18nField'
import { DeleteButton } from './DeleteButton'
import type { I18nText } from '@/lib/menu/admin/validate'
import type { AdminOptionRaw } from '@/lib/menu/admin/queries'

export function OptionRow({
  groupId, initial, onDone,
}: {
  groupId: string
  initial: AdminOptionRaw | null
  /** called after a new option is saved (to close the draft row) */
  onDone?: () => void
}) {
  const [name, setName] = useState<I18nText>(initial?.name ?? {})
  const [delta, setDelta] = useState(initial ? formatGroszeToZlotyInput(initial.price_delta) : '0')
  const [sort, setSort] = useState(String(initial?.sort ?? 0))

  const inputCls = 'w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-beet'

  const dirty =
    !eqI18n(name, initial?.name ?? {}) ||
    (initial ? parseZlotyToGrosze(delta, { allowNegative: true }) !== initial.price_delta : delta.trim() !== '0') ||
    (initial ? Number(sort) !== initial.sort : sort.trim() !== '0')

  async function save(): Promise<SaveResult> {
    const deltaGrosze = parseZlotyToGrosze(delta, { allowNegative: true })
    if (deltaGrosze === null) return { ok: false, error: 'Опция: некорректная доп-цена' }
    const sortNum = Number(sort)
    if (!Number.isInteger(sortNum)) return { ok: false, error: 'Опция: порядок — целое число' }
    const res = await upsertOption({
      id: initial?.id, optionGroupId: groupId, name, priceDelta: deltaGrosze, sort: sortNum,
    })
    if (!res.ok) {
      return { ok: false, error: res.error === 'unauthorized' ? 'Нет доступа' : 'Опция: польское название обязательно' }
    }
    setDelta(formatGroszeToZlotyInput(deltaGrosze))
    setSort(String(sortNum))
    onDone?.()
    return { ok: true }
  }

  useSaveRegistration(initial ? `option:${initial.id}` : `option:new:${groupId}`, dirty, save)

  return (
    <div className="rounded-xl border border-line bg-panel p-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem_6rem_auto] sm:items-end">
        <I18nField label="Опция" value={name} onChange={setName} />
        <label>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Доп-цена, zł</span>
          <input value={delta} onChange={(e) => setDelta(e.target.value)} inputMode="decimal" className={inputCls} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Порядок</span>
          <input value={sort} onChange={(e) => setSort(e.target.value)} inputMode="numeric" className={inputCls} />
        </label>
        <div className="flex gap-2">
          {initial ? (
            <DeleteButton kind="option" id={initial.id} confirmText="Удалить опцию?" small />
          ) : (
            <button
              type="button"
              onClick={() => onDone?.()}
              className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted hover:bg-ink hover:text-paper"
            >
              Убрать
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
