'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export function LogFilter({ maxDate }: { maxDate: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [from, setFrom] = useState(params.get('from') ?? '')
  const [to, setTo] = useState(params.get('to') ?? '')

  const inputCls = 'rounded-xl border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-beet'

  function apply() {
    const q = new URLSearchParams()
    if (from) q.set('from', from)
    if (to) q.set('to', to)
    router.push(`/admin/logs${q.toString() ? `?${q}` : ''}`)
  }
  function reset() {
    setFrom('')
    setTo('')
    router.push('/admin/logs')
  }

  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">С даты</span>
        <input type="date" value={from} max={to || maxDate} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">По дату</span>
        <input type="date" value={to} min={from} max={maxDate} onChange={(e) => setTo(e.target.value)} className={inputCls} />
      </label>
      <button type="button" onClick={apply} className="rounded-full bg-beet px-5 py-2 text-sm font-bold text-paper">
        Применить
      </button>
      {(from || to) && (
        <button type="button" onClick={reset} className="rounded-full border border-line px-5 py-2 text-sm font-semibold text-ink/70 hover:bg-ink hover:text-paper">
          Сбросить
        </button>
      )}
    </div>
  )
}
