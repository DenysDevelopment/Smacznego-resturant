'use client'
import { useState } from 'react'
import { upsertOptionGroup } from '@/lib/menu/admin/actions'
import { useSaveRegistration, eqI18n, type SaveResult } from '@/components/admin/SaveBar'
import { I18nField } from './I18nField'
import { OptionRow } from './OptionRow'
import { DeleteButton } from './DeleteButton'
import type { I18nText } from '@/lib/menu/admin/validate'
import type { AdminOptionGroupRaw } from '@/lib/menu/admin/queries'

export function OptionGroupEditor({
  dishId, initial, onDone,
}: {
  dishId: string
  initial: AdminOptionGroupRaw | null
  /** called after a new group is saved (to close the draft) */
  onDone?: () => void
}) {
  const [name, setName] = useState<I18nText>(initial?.name ?? {})
  const [minSelect, setMinSelect] = useState(String(initial?.min_select ?? 0))
  const [maxSelect, setMaxSelect] = useState(String(initial?.max_select ?? 1))
  const [required, setRequired] = useState(initial?.required ?? false)
  const [sort, setSort] = useState(String(initial?.sort ?? 0))
  const [addingOption, setAddingOption] = useState(false)

  const inputCls = 'w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-beet'
  const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-muted'

  const dirty =
    !eqI18n(name, initial?.name ?? {}) ||
    (initial ? Number(minSelect) !== initial.min_select : minSelect.trim() !== '0') ||
    (initial ? Number(maxSelect) !== initial.max_select : maxSelect.trim() !== '1') ||
    required !== (initial?.required ?? false) ||
    (initial ? Number(sort) !== initial.sort : sort.trim() !== '0')

  async function save(): Promise<SaveResult> {
    const min = Number(minSelect)
    const max = Number(maxSelect)
    if (!Number.isInteger(min) || min < 0) return { ok: false, error: 'Группа опций: мин. выбор — целое число ≥ 0' }
    if (!Number.isInteger(max) || max < min) return { ok: false, error: 'Группа опций: макс. выбор должен быть ≥ мин.' }
    const sortNum = Number(sort)
    if (!Number.isInteger(sortNum)) return { ok: false, error: 'Группа опций: порядок — целое число' }
    const res = await upsertOptionGroup({
      id: initial?.id, dishId, name, minSelect: min, maxSelect: max, required, sort: sortNum,
    })
    if (!res.ok) {
      return { ok: false, error: res.error === 'unauthorized' ? 'Нет доступа' : 'Группа опций: польское название обязательно' }
    }
    setMinSelect(String(min))
    setMaxSelect(String(max))
    setSort(String(sortNum))
    onDone?.()
    return { ok: true }
  }

  useSaveRegistration(initial ? `group:${initial.id}` : `group:new:${dishId}`, dirty, save)

  return (
    <div className="rounded-2xl border border-line bg-panel/50 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_6rem_6rem_6rem] sm:items-end">
        <I18nField label="Группа опций" value={name} onChange={setName} />
        <label>
          <span className={labelCls}>Мин.</span>
          <input value={minSelect} onChange={(e) => setMinSelect(e.target.value)} inputMode="numeric" className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>Макс.</span>
          <input value={maxSelect} onChange={(e) => setMaxSelect(e.target.value)} inputMode="numeric" className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>Порядок</span>
          <input value={sort} onChange={(e) => setSort(e.target.value)} inputMode="numeric" className={inputCls} />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="h-4 w-4 accent-beet" />
          Обязательная
        </label>
        {initial ? (
          <DeleteButton
            kind="group"
            id={initial.id}
            confirmText="Удалить группу опций вместе с её опциями?"
            small
          />
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

      {initial && (
        <div className="mt-4 space-y-2 border-t border-line pt-3">
          {initial.options.map((opt) => (
            <OptionRow key={opt.id} groupId={initial.id} initial={opt} />
          ))}
          {addingOption ? (
            <OptionRow groupId={initial.id} initial={null} onDone={() => setAddingOption(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setAddingOption(true)}
              className="rounded-full border border-line px-4 py-1.5 text-xs font-bold text-ink/70 hover:bg-ink hover:text-paper"
            >
              + Опция
            </button>
          )}
        </div>
      )}
    </div>
  )
}
