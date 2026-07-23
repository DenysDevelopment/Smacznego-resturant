// Warsaw-timezone day boundaries as UTC instants, DST-aware.
// Used to reset the kitchen board's "Завершены" lane at 00:00 Europe/Warsaw
// and to show when the next reset happens.

const TZ = 'Europe/Warsaw'

interface WallParts { y: number; mo: number; da: number; h: number; mi: number; s: number }

function warsawParts(d: Date): WallParts {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value])) as Record<string, string>
  // Intl may emit hour "24" at midnight in some engines — normalize to 0.
  const h = Number(p.hour) % 24
  return { y: Number(p.year), mo: Number(p.month), da: Number(p.day), h, mi: Number(p.minute), s: Number(p.second) }
}

/** UTC instant for a given Warsaw wall-clock date/time (single-step DST correction). */
function warsawWallToUtc(y: number, mo: number, da: number, h = 0, mi = 0): Date {
  const guess = Date.UTC(y, mo - 1, da, h, mi)
  const asWarsaw = warsawParts(new Date(guess))
  const asWarsawAsUtc = Date.UTC(asWarsaw.y, asWarsaw.mo - 1, asWarsaw.da, asWarsaw.h, asWarsaw.mi, asWarsaw.s)
  const offset = asWarsawAsUtc - guess // ms Warsaw is ahead of UTC at that instant
  return new Date(guess - offset)
}

const SLOT_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
/**
 * UTC instant for a Warsaw wall-clock slot string 'YYYY-MM-DDTHH:MM'
 * (what the checkout generates/validates), or null if malformed. Avoids
 * `new Date(str)`, which would interpret the slot in the server's timezone.
 */
export function warsawSlotToUtc(value: string): Date | null {
  const m = SLOT_RE.exec(value)
  if (!m) return null
  return warsawWallToUtc(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]))
}

/** 00:00 Europe/Warsaw of the day containing `now`, as a UTC Date. */
export function warsawStartOfDayUtc(now: Date): Date {
  const p = warsawParts(now)
  return warsawWallToUtc(p.y, p.mo, p.da, 0, 0)
}

/** The next 00:00 Europe/Warsaw strictly after `now`, as a UTC Date. */
export function warsawNextMidnightUtc(now: Date): Date {
  const p = warsawParts(now)
  // start from today's Warsaw calendar date + 1 day (via UTC date math on the calendar parts)
  const nextCal = new Date(Date.UTC(p.y, p.mo - 1, p.da + 1))
  return warsawWallToUtc(nextCal.getUTCFullYear(), nextCal.getUTCMonth() + 1, nextCal.getUTCDate(), 0, 0)
}

/** Current Warsaw UTC offset as a "GMT+2" / "GMT+1" label (DST-aware). */
export function warsawGmtLabel(now: Date): string {
  const p = warsawParts(now)
  const asWarsawAsUtc = Date.UTC(p.y, p.mo - 1, p.da, p.h, p.mi, p.s)
  const offsetMin = Math.round((asWarsawAsUtc - now.getTime()) / 60_000)
  const sign = offsetMin >= 0 ? '+' : '-'
  return `GMT${sign}${Math.floor(Math.abs(offsetMin) / 60)}`
}

/** Warsaw calendar date of `now` as 'YYYY-MM-DD'. */
export function warsawTodayYmd(now: Date): string {
  const p = warsawParts(now)
  return `${p.y}-${String(p.mo).padStart(2, '0')}-${String(p.da).padStart(2, '0')}`
}

/** 00:00 Europe/Warsaw of the given 'YYYY-MM-DD', as a UTC Date. */
export function warsawYmdStartUtc(ymd: string): Date {
  const [y, mo, da] = ymd.split('-').map(Number)
  return warsawWallToUtc(y, mo, da, 0, 0)
}

/** The calendar day after 'YYYY-MM-DD', as 'YYYY-MM-DD'. */
export function nextYmd(ymd: string): string {
  const [y, mo, da] = ymd.split('-').map(Number)
  const d = new Date(Date.UTC(y, mo - 1, da + 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}
