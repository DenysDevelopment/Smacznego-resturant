import { describe, it, expect } from 'vitest'
import { validateSettingsInput, type SettingsInput } from '@/lib/settings/admin/validate'

function base(over: Partial<SettingsInput> = {}): SettingsInput {
  return {
    name: 'Smacznego',
    phone: '+48 500 100 200',
    addressText: 'ul. Prosta 1, Warszawa',
    lat: 52.23,
    lng: 21.01,
    deliveryRadiusM: 5000,
    deliveryFee: 800,
    freeDeliveryThreshold: 6000,
    minOrder: 3000,
    hours: {
      mon: { open: '10:00', close: '22:00' }, tue: { open: '10:00', close: '22:00' },
      wed: { open: '10:00', close: '22:00' }, thu: { open: '10:00', close: '22:00' },
      fri: { open: '10:00', close: '22:00' }, sat: { open: '11:00', close: '22:00' },
      sun: null,
    },
    prepLeadMinutes: 40,
    ...over,
  }
}

describe('validateSettingsInput', () => {
  it('accepts valid settings', () => {
    expect(validateSettingsInput(base())).toEqual({ ok: true })
  })

  it('rejects bad name/phone/address', () => {
    expect(validateSettingsInput(base({ name: ' ' }))).toMatchObject({ ok: false, field: 'name' })
    expect(validateSettingsInput(base({ phone: '123' }))).toMatchObject({ ok: false, field: 'phone' })
    expect(validateSettingsInput(base({ addressText: '' }))).toMatchObject({ ok: false, field: 'addressText' })
  })

  it('rejects out-of-range coordinates and radius', () => {
    expect(validateSettingsInput(base({ lat: 91 }))).toMatchObject({ ok: false, field: 'lat' })
    expect(validateSettingsInput(base({ lng: -181 }))).toMatchObject({ ok: false, field: 'lng' })
    expect(validateSettingsInput(base({ deliveryRadiusM: 60_000 }))).toMatchObject({ ok: false, field: 'deliveryRadiusM' })
  })

  it('rejects non-integer or negative money', () => {
    expect(validateSettingsInput(base({ deliveryFee: -1 }))).toMatchObject({ ok: false, field: 'deliveryFee' })
    expect(validateSettingsInput(base({ minOrder: 10.5 }))).toMatchObject({ ok: false, field: 'minOrder' })
  })

  it('validates hours: HH:MM format, open < close, null = closed ok', () => {
    expect(validateSettingsInput(base({
      hours: { ...base().hours, mon: { open: '22:00', close: '10:00' } },
    }))).toMatchObject({ ok: false, field: 'hours' })
    expect(validateSettingsInput(base({
      hours: { ...base().hours, tue: { open: '9:00', close: '22:00' } },
    }))).toMatchObject({ ok: false, field: 'hours' })
    expect(validateSettingsInput(base({
      hours: { ...base().hours, wed: null },
    }))).toEqual({ ok: true })
  })

  it('rejects prep lead out of range', () => {
    expect(validateSettingsInput(base({ prepLeadMinutes: 300 }))).toMatchObject({ ok: false, field: 'prepLeadMinutes' })
  })
})
