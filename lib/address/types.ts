export interface AddressValue {
  street: string; building: string; apartment: string
  floor: string; entrance: string; intercom: string
  lat: number | null; lng: number | null; formatted: string
}

export function emptyAddress(): AddressValue {
  return { street: '', building: '', apartment: '', floor: '', entrance: '', intercom: '', lat: null, lng: null, formatted: '' }
}

export function formatAddress(a: AddressValue): string {
  const base = [a.street, a.building].filter(Boolean).join(' ')
  return a.apartment ? `${base}/${a.apartment}` : base
}

export interface AddressParts {
  street?: string; building?: string; apartment?: string
  floor?: string; entrance?: string; intercom?: string
}

export interface AddressLabels {
  building: string; apartment: string; floor: string; entrance: string; intercom: string
}
const RU_ADDRESS_LABELS: AddressLabels = { building: 'дом', apartment: 'кв.', floor: 'этаж', entrance: 'подъезд', intercom: 'домофон' }

/**
 * Full, human-readable delivery address from the stored order fields. Every part
 * except the street name gets a label ("д." house, "кв." flat, floor, entrance,
 * intercom) so a bare number is never ambiguous — e.g. a street that itself
 * contains a digit. Labels default to Russian (admin/courier UI); pass localized
 * labels for customer-facing views.
 */
export function formatOrderAddress(a: AddressParts | null | undefined, labels: AddressLabels = RU_ADDRESS_LABELS): string {
  if (!a) return ''
  const parts = [
    a.building?.trim() && `${labels.building} ${a.building.trim()}`,
    a.apartment?.trim() && `${labels.apartment} ${a.apartment.trim()}`,
    a.floor?.trim() && `${labels.floor} ${a.floor.trim()}`,
    a.entrance?.trim() && `${labels.entrance} ${a.entrance.trim()}`,
    a.intercom?.trim() && `${labels.intercom} ${a.intercom.trim()}`,
  ].filter(Boolean)
  return [a.street?.trim(), ...parts].filter(Boolean).join(' · ')
}
