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
