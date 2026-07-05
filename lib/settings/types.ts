export type { WeeklyHours, DayHours } from '@/lib/hours/hours'
import type { WeeklyHours } from '@/lib/hours/hours'

export interface Settings {
  name: string
  phone: string
  addressText: string
  lat: number
  lng: number
  deliveryRadiusM: number
  deliveryFee: number
  freeDeliveryThreshold: number
  minOrder: number
  hours: WeeklyHours
  prepLeadMinutes: number
}
