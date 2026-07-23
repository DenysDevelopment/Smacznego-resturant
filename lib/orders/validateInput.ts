import { isValidPlPhone } from '@/lib/phone/phone'
import { warsawNow, type WeeklyHours } from '@/lib/hours/hours'
import type { CreateOrderInput } from './createOrder'

const MAX = {
  name: 100,
  phone: 20,
  notes: 500,
  addressField: 120,
  cartLines: 50,
  qty: 99,
  optionsPerLine: 20,
  cashChangeFrom: 1_000_000, // grosze = 10 000 zł
} as const

type Result = { ok: true } | { ok: false; error: string }
const bad = (error: string): Result => ({ ok: false, error })

/**
 * Structural bounds on client-supplied order input. Prices are NOT trusted
 * from here regardless — revalidateItems re-prices everything from the DB.
 */
export function validateOrderInput(input: CreateOrderInput): Result {
  if (input.type !== 'delivery' && input.type !== 'pickup') return bad('bad_type')

  if (typeof input.name !== 'string') return bad('bad_name')
  const name = input.name.trim()
  if (name.length < 1 || name.length > MAX.name) return bad('bad_name')

  if (typeof input.phone !== 'string' || input.phone.length > MAX.phone || !isValidPlPhone(input.phone)) {
    return bad('bad_phone')
  }

  if (typeof input.notes !== 'string' || input.notes.length > MAX.notes) return bad('bad_notes')

  if (input.paymentMethod !== 'cash' && input.paymentMethod !== 'card') return bad('bad_payment')

  if (
    input.cashChangeFrom !== null &&
    (!Number.isInteger(input.cashChangeFrom) || input.cashChangeFrom < 0 || input.cashChangeFrom > MAX.cashChangeFrom)
  ) return bad('bad_cash')

  if (!Array.isArray(input.cart) || input.cart.length < 1 || input.cart.length > MAX.cartLines) {
    return bad('bad_cart')
  }
  for (const line of input.cart) {
    if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > MAX.qty) return bad('bad_qty')
    if (!Array.isArray(line.selectedOptions) || line.selectedOptions.length > MAX.optionsPerLine) {
      return bad('bad_options')
    }
  }

  if (input.type === 'delivery') {
    const a = input.address
    if (!a) return bad('bad_address')
    const fields = [a.street, a.building, a.apartment, a.floor, a.entrance, a.intercom, a.formatted]
    for (const f of fields) {
      if (typeof f !== 'string' || f.length > MAX.addressField) return bad('bad_address')
    }
    if (a.street.trim().length === 0) return bad('bad_address')
  }

  return { ok: true }
}

const SLOT_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
const HORIZON_DAYS = 7

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
function epochDays(dateStr: string): number {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return Date.UTC(y, mo - 1, d) / 86_400_000
}

/**
 * A scheduled slot ('YYYY-MM-DDTHH:MM', Warsaw wall-clock) is valid iff it
 * falls inside opening hours for its day and within
 * [now + prepLeadMinutes, now + 7 days]. Closes the "schedule anything to
 * bypass the closed-store check" hole.
 */
export function validateSchedule(
  value: string,
  hours: WeeklyHours,
  prepLeadMinutes: number,
  now: Date,
): boolean {
  const m = SLOT_RE.exec(value)
  if (!m) return false
  const [, y, mo, d, hh, mm] = m
  if (Number(hh) > 23 || Number(mm) > 59) return false
  const dateStr = `${y}-${mo}-${d}`
  const stamp = new Date(`${dateStr}T00:00:00Z`)
  if (Number.isNaN(stamp.getTime())) return false

  const day = hours[DAY_KEYS[stamp.getUTCDay()]]
  if (!day) return false
  const minutes = Number(hh) * 60 + Number(mm)
  if (minutes < toMinutes(day.open) || minutes >= toMinutes(day.close)) return false

  const nw = warsawNow(now)
  const nowAbs = epochDays(nw.dateStr) * 1440 + nw.minutes
  const schedAbs = epochDays(dateStr) * 1440 + minutes
  return schedAbs >= nowAbs + prepLeadMinutes && schedAbs <= nowAbs + HORIZON_DAYS * 1440
}
