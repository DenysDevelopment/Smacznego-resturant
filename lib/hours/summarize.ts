import type { DayHours, WeeklyHours } from './hours'

const ORDER: (keyof WeeklyHours)[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export interface HoursLine {
  days: (keyof WeeklyHours)[]
  /** null when the restaurant is closed on these days */
  hours: DayHours | null
}

function same(a: DayHours | null, b: DayHours | null): boolean {
  if (!a || !b) return a === b
  return a.open === b.open && a.close === b.close
}

/** Collapse the 7-day schedule into consecutive runs that share the same hours. */
export function summarizeHours(hours: WeeklyHours): HoursLine[] {
  const lines: HoursLine[] = []
  for (const day of ORDER) {
    const h = hours[day]
    const last = lines[lines.length - 1]
    if (last && same(last.hours, h)) last.days.push(day)
    else lines.push({ days: [day], hours: h })
  }
  return lines
}
