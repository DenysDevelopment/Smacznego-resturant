// Pure validator for the admin settings form. Never let free-form jsonb
// through — malformed hours would break isOpenNow/summarizeHours.
import { isValidPlPhone } from '@/lib/phone/phone'
import type { WeeklyHours, DayHours } from '@/lib/hours/hours'

export interface SettingsInput {
  name: string
  phone: string
  addressText: string
  lat: number
  lng: number
  deliveryRadiusM: number
  deliveryFee: number // grosze
  freeDeliveryThreshold: number // grosze
  minOrder: number // grosze
  hours: WeeklyHours
  prepLeadMinutes: number
}

export type FieldError = { ok: false; field: string; error: string }
export type Valid = { ok: true }

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function validDay(day: DayHours | null): boolean {
  if (day === null) return true
  if (typeof day !== 'object' || typeof day.open !== 'string' || typeof day.close !== 'string') return false
  if (!HHMM_RE.test(day.open) || !HHMM_RE.test(day.close)) return false
  return toMinutes(day.open) < toMinutes(day.close)
}

const MONEY_MAX = 100_000_00 // 100 000 zł in grosze — sanity ceiling

function validMoney(v: number): boolean {
  return Number.isInteger(v) && v >= 0 && v <= MONEY_MAX
}

export function validateSettingsInput(input: SettingsInput): Valid | FieldError {
  if (!input.name?.trim() || input.name.length > 100) return { ok: false, field: 'name', error: 'bad_name' }
  if (!input.phone?.trim() || input.phone.length > 20 || !isValidPlPhone(input.phone)) {
    return { ok: false, field: 'phone', error: 'bad_phone' }
  }
  if (!input.addressText?.trim() || input.addressText.length > 200) {
    return { ok: false, field: 'addressText', error: 'bad_address' }
  }
  if (typeof input.lat !== 'number' || !Number.isFinite(input.lat) || input.lat < -90 || input.lat > 90) {
    return { ok: false, field: 'lat', error: 'bad_lat' }
  }
  if (typeof input.lng !== 'number' || !Number.isFinite(input.lng) || input.lng < -180 || input.lng > 180) {
    return { ok: false, field: 'lng', error: 'bad_lng' }
  }
  if (!Number.isInteger(input.deliveryRadiusM) || input.deliveryRadiusM < 0 || input.deliveryRadiusM > 50_000) {
    return { ok: false, field: 'deliveryRadiusM', error: 'bad_radius' }
  }
  if (!validMoney(input.deliveryFee)) return { ok: false, field: 'deliveryFee', error: 'bad_money' }
  if (!validMoney(input.freeDeliveryThreshold)) return { ok: false, field: 'freeDeliveryThreshold', error: 'bad_money' }
  if (!validMoney(input.minOrder)) return { ok: false, field: 'minOrder', error: 'bad_money' }
  if (!Number.isInteger(input.prepLeadMinutes) || input.prepLeadMinutes < 0 || input.prepLeadMinutes > 240) {
    return { ok: false, field: 'prepLeadMinutes', error: 'bad_prep' }
  }
  if (!input.hours || typeof input.hours !== 'object') return { ok: false, field: 'hours', error: 'bad_hours' }
  for (const key of DAY_KEYS) {
    if (!(key in input.hours) || !validDay(input.hours[key])) {
      return { ok: false, field: 'hours', error: `bad_hours_${key}` }
    }
  }
  return { ok: true }
}
