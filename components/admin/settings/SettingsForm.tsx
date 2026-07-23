'use client'
import { useState } from 'react'
import { updateSettings } from '@/lib/settings/admin/actions'
import { parseZlotyToGrosze, formatGroszeToZlotyInput } from '@/lib/menu/admin/money'
import { useSaveRegistration, type SaveResult } from '@/components/admin/SaveBar'
import { HoursEditor } from './HoursEditor'
import type { Settings } from '@/lib/settings/types'
import type { WeeklyHours } from '@/lib/hours/hours'

const FIELD_ERRORS: Record<string, string> = {
  name: 'Укажите название',
  phone: 'Некорректный телефон (польский формат)',
  addressText: 'Укажите адрес',
  lat: 'Широта вне диапазона',
  lng: 'Долгота вне диапазона',
  deliveryRadiusM: 'Радиус 0–50 000 м',
  deliveryFee: 'Некорректная сумма',
  freeDeliveryThreshold: 'Некорректная сумма',
  minOrder: 'Некорректная сумма',
  prepLeadMinutes: 'Время подготовки 0–240 мин',
  hours: 'Проверьте часы работы (открытие раньше закрытия)',
}

export function SettingsForm({ initial }: { initial: Settings }) {
  const [name, setName] = useState(initial.name)
  const [phone, setPhone] = useState(initial.phone)
  const [addressText, setAddressText] = useState(initial.addressText)
  const [hours, setHours] = useState<WeeklyHours>(initial.hours)
  const [deliveryFee, setDeliveryFee] = useState(formatGroszeToZlotyInput(initial.deliveryFee))
  const [freeFrom, setFreeFrom] = useState(formatGroszeToZlotyInput(initial.freeDeliveryThreshold))
  const [minOrder, setMinOrder] = useState(formatGroszeToZlotyInput(initial.minOrder))
  const [prepLead, setPrepLead] = useState(String(initial.prepLeadMinutes))
  const [lat, setLat] = useState(String(initial.lat))
  const [lng, setLng] = useState(String(initial.lng))
  const [radius, setRadius] = useState(String(initial.deliveryRadiusM))
  const [showAdvanced, setShowAdvanced] = useState(false)

  const inputCls = 'w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-beet'
  const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-muted'

  // compare by meaning so reverting a value (incl. comma/dot money forms) clears dirty
  const dirty =
    name.trim() !== initial.name ||
    phone.trim() !== initial.phone ||
    addressText.trim() !== initial.addressText ||
    JSON.stringify(hours) !== JSON.stringify(initial.hours) ||
    parseZlotyToGrosze(deliveryFee) !== initial.deliveryFee ||
    parseZlotyToGrosze(freeFrom) !== initial.freeDeliveryThreshold ||
    parseZlotyToGrosze(minOrder) !== initial.minOrder ||
    Number(prepLead) !== initial.prepLeadMinutes ||
    Number(lat.replace(',', '.')) !== initial.lat ||
    Number(lng.replace(',', '.')) !== initial.lng ||
    Number(radius) !== initial.deliveryRadiusM

  async function save(): Promise<SaveResult> {
    const fee = parseZlotyToGrosze(deliveryFee)
    const free = parseZlotyToGrosze(freeFrom)
    const min = parseZlotyToGrosze(minOrder)
    if (fee === null) return { ok: false, error: `Доставка: ${FIELD_ERRORS.deliveryFee}` }
    if (free === null) return { ok: false, error: `Бесплатно от: ${FIELD_ERRORS.freeDeliveryThreshold}` }
    if (min === null) return { ok: false, error: `Мин. заказ: ${FIELD_ERRORS.minOrder}` }
    const prep = Number(prepLead)
    const latNum = Number(lat.replace(',', '.'))
    const lngNum = Number(lng.replace(',', '.'))
    const radiusNum = Number(radius)

    const res = await updateSettings({
      name, phone, addressText,
      lat: latNum, lng: lngNum, deliveryRadiusM: radiusNum,
      deliveryFee: fee, freeDeliveryThreshold: free, minOrder: min,
      hours, prepLeadMinutes: prep,
    })
    if (!res.ok) {
      return { ok: false, error: `Настройки: ${(res.field && FIELD_ERRORS[res.field]) || 'не удалось сохранить'}` }
    }
    setDeliveryFee(formatGroszeToZlotyInput(fee))
    setFreeFrom(formatGroszeToZlotyInput(free))
    setMinOrder(formatGroszeToZlotyInput(min))
    setPrepLead(String(prep))
    setLat(String(latNum))
    setLng(String(lngNum))
    setRadius(String(radiusNum))
    return { ok: true }
  }

  useSaveRegistration('settings', dirty, save)

  return (
    <div className="space-y-5 rounded-2xl border border-line bg-panel/50 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className={labelCls}>Название</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>Телефон</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={inputCls} />
        </label>
      </div>
      <label>
        <span className={labelCls}>Адрес</span>
        <input value={addressText} onChange={(e) => setAddressText(e.target.value)} className={inputCls} />
      </label>

      <div>
        <span className={labelCls}>Часы работы</span>
        <HoursEditor value={hours} onChange={setHours} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label>
          <span className={labelCls}>Доставка, zł</span>
          <input value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} inputMode="decimal" className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>Бесплатно от, zł</span>
          <input value={freeFrom} onChange={(e) => setFreeFrom(e.target.value)} inputMode="decimal" className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>Мин. заказ, zł</span>
          <input value={minOrder} onChange={(e) => setMinOrder(e.target.value)} inputMode="decimal" className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>Подготовка, мин</span>
          <input value={prepLead} onChange={(e) => setPrepLead(e.target.value)} inputMode="numeric" className={inputCls} />
        </label>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-xs font-bold uppercase tracking-wide text-muted hover:text-ink"
        >
          {showAdvanced ? '▾ Дополнительно' : '▸ Дополнительно (координаты, радиус)'}
        </button>
        {showAdvanced && (
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <label>
              <span className={labelCls}>Широта</span>
              <input value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" className={inputCls} />
            </label>
            <label>
              <span className={labelCls}>Долгота</span>
              <input value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" className={inputCls} />
            </label>
            <label>
              <span className={labelCls}>Радиус доставки, м</span>
              <input value={radius} onChange={(e) => setRadius(e.target.value)} inputMode="numeric" className={inputCls} />
            </label>
          </div>
        )}
      </div>

    </div>
  )
}
