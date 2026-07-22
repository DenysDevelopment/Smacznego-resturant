export interface DayHours { open: string; close: string }
export type WeeklyHours = Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', DayHours | null>

const DAY_KEYS: (keyof WeeklyHours)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function warsawNow(date: Date): { dayKey: keyof WeeklyHours; dateStr: string; minutes: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw', weekday: 'short',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]))
  const dateStr = `${parts.year}-${parts.month}-${parts.day}`
  const jsDay = new Date(`${dateStr}T00:00:00Z`).getUTCDay() // 0=Sun..6=Sat, stable from the date string
  const minutes = Number(parts.hour) * 60 + Number(parts.minute)
  return { dayKey: DAY_KEYS[jsDay], dateStr, minutes }
}

export function isOpenNow(hours: WeeklyHours, now: Date): boolean {
  const { dayKey, minutes } = warsawNow(now)
  const day = hours[dayKey]
  if (!day) return false
  return minutes >= toMinutes(day.open) && minutes < toMinutes(day.close)
}

export function generateSlots(
  hours: WeeklyHours, prepLeadMinutes: number, now: Date, horizonDays = 2,
): { value: string; dayKey: keyof WeeklyHours; hhmm: string }[] {
  const { dayKey, dateStr, minutes } = warsawNow(now)
  const startDayIndex = DAY_KEYS.indexOf(dayKey)
  const earliest = minutes + prepLeadMinutes
  const out: { value: string; dayKey: keyof WeeklyHours; hhmm: string }[] = []

  for (let d = 0; d < horizonDays; d++) {
    const key = DAY_KEYS[(startDayIndex + d) % 7]
    const day = hours[key]
    if (!day) continue
    const open = toMinutes(day.open)
    const close = toMinutes(day.close)
    // step at 30-min marks; on day 0 respect `earliest`
    let m = d === 0 ? Math.max(open, Math.ceil(earliest / 30) * 30) : open
    if (m < open) m = open
    const dateOfDay = addDaysToDateStr(dateStr, d)
    for (; m < close; m += 30) {
      const hhmm = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
      out.push({ value: `${dateOfDay}T${hhmm}`, dayKey: key, hhmm })
    }
  }
  return out
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const base = new Date(Date.UTC(y, mo - 1, d))
  base.setUTCDate(base.getUTCDate() + days)
  return `${base.getUTCFullYear()}-${pad(base.getUTCMonth() + 1)}-${pad(base.getUTCDate())}`
}
