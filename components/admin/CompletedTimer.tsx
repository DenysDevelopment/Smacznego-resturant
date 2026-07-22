'use client'
import { useEffect, useState } from 'react'

export function CompletedTimer({ nextResetIso, gmtLabel }: { nextResetIso: string; gmtLabel: string }) {
  const base = `Завершённые за сегодня очищаются каждый день в 00:00 (${gmtLabel})`
  // null on first render (server + hydration) → no mismatch; filled after mount
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  let countdown = ''
  if (now !== null) {
    const ms = Math.max(0, new Date(nextResetIso).getTime() - now)
    const h = Math.floor(ms / 3600_000)
    const m = Math.floor((ms % 3600_000) / 60_000)
    countdown = `Следующая очистка через ${h} ч ${m} мин.`
  }

  return (
    <span className="group relative inline-flex">
      <span className="inline-flex cursor-help text-muted group-hover:text-ink" aria-label={`${base}. ${countdown}`}>
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2.5 1.5M9 2h6M12 5V2" />
        </svg>
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-30 mt-1.5 hidden w-60 rounded-lg bg-ink px-3 py-2 text-xs font-medium normal-case leading-snug tracking-normal text-paper shadow-lg group-hover:block"
      >
        {base}.{countdown && <span className="mt-1 block font-bold text-mustard">{countdown}</span>}
      </span>
    </span>
  )
}
