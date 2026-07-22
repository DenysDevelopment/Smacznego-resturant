'use client'
import { useRef } from 'react'
import type { WeeklyHours, DayHours } from '@/lib/hours/hours'

const DAYS: { key: keyof WeeklyHours; label: string }[] = [
  { key: 'mon', label: 'Пн' }, { key: 'tue', label: 'Вт' }, { key: 'wed', label: 'Ср' },
  { key: 'thu', label: 'Чт' }, { key: 'fri', label: 'Пт' }, { key: 'sat', label: 'Сб' },
  { key: 'sun', label: 'Вс' },
]

const DEFAULT_DAY: DayHours = { open: '10:00', close: '22:00' }

export function HoursEditor({ value, onChange }: { value: WeeklyHours; onChange: (v: WeeklyHours) => void }) {
  const inputCls = 'rounded-lg border border-line bg-panel px-2 py-1.5 text-sm outline-none focus:border-beet'

  // Remember each day's last open-hours so unchecking "Закрыто" restores the
  // original time (not a hardcoded default) — reverting the toggle truly reverts.
  const lastOpen = useRef<Partial<Record<keyof WeeklyHours, DayHours>>>({})
  for (const { key } of DAYS) {
    const d = value[key]
    if (d) lastOpen.current[key] = d
  }

  return (
    <div className="space-y-1.5">
      {DAYS.map(({ key, label }) => {
        const day = value[key]
        return (
          <div key={key} className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="w-8 text-sm font-bold">{label}</span>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted">
              <input
                type="checkbox"
                checked={day === null}
                onChange={(e) =>
                  onChange({ ...value, [key]: e.target.checked ? null : (lastOpen.current[key] ?? DEFAULT_DAY) })
                }
                className="h-4 w-4 accent-beet"
              />
              Закрыто
            </label>
            {day && (
              <div className="flex min-w-0 items-center gap-2">
                <input
                  type="time"
                  value={day.open}
                  onChange={(e) => onChange({ ...value, [key]: { ...day, open: e.target.value } })}
                  className={`${inputCls} min-w-0 flex-1`}
                />
                <span className="text-muted">—</span>
                <input
                  type="time"
                  value={day.close}
                  onChange={(e) => onChange({ ...value, [key]: { ...day, close: e.target.value } })}
                  className={`${inputCls} min-w-0 flex-1`}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
