'use client'
import { useState } from 'react'
import { saveFlags } from '@/lib/content/flagActions'
import { useSaveRegistration, type SaveResult } from '@/components/admin/SaveBar'
import type { FlagDef } from '@/lib/content/flags'

export interface FlagItem extends FlagDef { enabled: boolean }

export function FlagsForm({ initial }: { initial: FlagItem[] }) {
  const [state, setState] = useState<Record<string, boolean>>(
    () => Object.fromEntries(initial.map((f) => [f.key, f.enabled])),
  )

  const dirty = initial.some((f) => state[f.key] !== f.enabled)

  async function save(): Promise<SaveResult> {
    const res = await saveFlags(initial.map((f) => ({ key: f.key, enabled: state[f.key] })))
    return res.ok ? { ok: true } : { ok: false, error: res.error === 'unauthorized' ? 'Нет доступа' : 'Показ: не удалось сохранить' }
  }

  useSaveRegistration('flags', dirty, save)

  const steps = initial.filter((f) => f.group === 'step')
  const texts = initial.filter((f) => f.group === 'text')

  const Toggle = ({ f }: { f: FlagItem }) => (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-paper px-4 py-2.5">
      <span className="text-sm font-medium">{f.label}</span>
      <input
        type="checkbox"
        checked={state[f.key]}
        onChange={(e) => setState((p) => ({ ...p, [f.key]: e.target.checked }))}
        className="h-5 w-5 shrink-0 accent-beet"
      />
    </label>
  )

  return (
    <section className="mt-8">
      <h2 className="mb-1 text-xl font-extrabold tracking-tight">Приём заказа — что показывать</h2>
      <p className="mb-3 text-sm text-muted">Снимите галку, чтобы скрыть этап или текст на странице отслеживания заказа. Тексты этих элементов меняются выше, в секции «Приём заказа».</p>
      <div className="space-y-4 rounded-2xl border border-line bg-panel/50 p-5">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Этапы статуса</p>
          <div className="space-y-2">{steps.map((f) => <Toggle key={f.key} f={f} />)}</div>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Тексты</p>
          <div className="space-y-2">{texts.map((f) => <Toggle key={f.key} f={f} />)}</div>
        </div>
      </div>
    </section>
  )
}
