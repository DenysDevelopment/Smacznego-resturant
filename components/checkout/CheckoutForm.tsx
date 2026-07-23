'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCart } from '@/components/CartProvider'
import { useSettings } from '@/components/SettingsProvider'
import { AddressFields } from './AddressFields'
import { Icon } from '@/components/Icon'
import { formatZloty } from '@/lib/menu/price'
import { deliveryFee, meetsMinOrder } from '@/lib/cart/totals'
import { isOpenNow, generateSlots, type WeeklyHours } from '@/lib/hours/hours'
import { isValidPlPhone } from '@/lib/phone/phone'
import { emptyAddress, formatAddress, type AddressValue } from '@/lib/address/types'
import { createOrder } from '@/lib/orders/createOrder'
import type { Locale } from '@/i18n/config'

type OrderType = 'delivery' | 'pickup'
const inputCls =
  'mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm font-medium text-ink outline-none transition-colors focus:border-beet'

export function CheckoutForm({ locale }: { locale: Locale }) {
  const t = useTranslations('checkout')
  const tf = useTranslations('footer')
  const settings = useSettings()
  const router = useRouter()
  const { items, subtotal, clear } = useCart()

  const [type, setType] = useState<OrderType>('delivery')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState<AddressValue>(emptyAddress)
  const [scheduledFor, setScheduledFor] = useState('')
  const [notes, setNotes] = useState('')
  const [payment, setPayment] = useState<'cash' | 'card'>('cash')
  const [changeFrom, setChangeFrom] = useState('')
  const [slots, setSlots] = useState<{ value: string; dayKey: string; hhmm: string }[]>([])
  const [openNow, setOpenNow] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [triedSubmit, setTriedSubmit] = useState(false)

  // Time-dependent data is computed after mount to avoid SSR/client hydration drift.
  useEffect(() => {
    const now = new Date()
    const open = isOpenNow(settings.hours as WeeklyHours, now)
    const s = generateSlots(settings.hours as WeeklyHours, settings.prepLeadMinutes, now)
    setOpenNow(open)
    setSlots(s)
    if (!open && s.length > 0) setScheduledFor(s[0].value)
  }, [settings])

  const fee = deliveryFee(subtotal, type, settings)
  const total = subtotal + fee
  const canCheckout = meetsMinOrder(subtotal, settings)
  const phoneOk = isValidPlPhone(phone)
  const addressOk = type === 'pickup' || address.street.trim().length > 0
  const formOk = name.trim().length > 0 && phoneOk && addressOk && (openNow || scheduledFor !== '')

  const dayLabel = (d: string) => tf(`days.${d}` as 'days.mon')
  const slotLabel = useMemo(
    () => (s: { dayKey: string; hhmm: string }) => `${dayLabel(s.dayKey)} · ${s.hhmm}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale],
  )

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center">
        <p className="text-lg text-muted">{t('emptyCart')}</p>
        <Link href={`/${locale}/menu`} className="mt-6 inline-block rounded-full bg-beet px-6 py-3 text-sm font-bold text-paper">
          {t('toMenu')}
        </Link>
      </div>
    )
  }

  async function submit() {
    setTriedSubmit(true)
    setError(null)
    if (!formOk) return
    setSubmitting(true)
    const changeGrosze = changeFrom.trim() ? Math.round(parseFloat(changeFrom.replace(',', '.')) * 100) : null
    const res = await createOrder({
      locale,
      type,
      name: name.trim(),
      phone: phone.trim(),
      address: type === 'delivery' ? { ...address, formatted: formatAddress(address) } : null,
      scheduledFor: scheduledFor || null,
      notes: notes.trim(),
      paymentMethod: payment,
      cashChangeFrom: payment === 'cash' && changeGrosze && changeGrosze > 0 ? changeGrosze : null,
      cart: items,
    })
    if ('token' in res) {
      clear()
      router.push(`/${locale}/order/${res.token}`)
      return
    }
    setSubmitting(false)
    const known = ['below_min_order', 'closed', 'rate_limited', 'bad_schedule']
    setError(known.includes(res.error) ? t(`errors.${res.error}` as 'errors.closed') : t('errors.generic'))
  }

  return (
    <div className="mx-auto max-w-2xl px-5 pb-16">
      <h1 className="pt-8 text-4xl font-extrabold tracking-tight sm:text-5xl">{t('title')}</h1>

      {/* Order type */}
      <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-line bg-panel p-1.5">
        {(['delivery', 'pickup'] as OrderType[]).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setType(opt)}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${type === opt ? 'bg-beet text-paper' : 'text-ink/70 hover:text-ink'}`}
          >
            {t(opt)}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-5">
        {/* Contact */}
        <section className="rounded-3xl border border-line bg-panel p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-beet">{t('contactTitle')}</h2>
          <div className="mt-3 grid gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t('name')}
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('namePlaceholder')} className={inputCls} />
              {triedSubmit && name.trim().length === 0 && <span className="mt-1 block text-xs font-medium text-brick">{t('nameRequired')}</span>}
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t('phone')}
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('phonePlaceholder')} inputMode="tel" className={inputCls} />
              {triedSubmit && !phoneOk && <span className="mt-1 block text-xs font-medium text-brick">{t('phoneInvalid')}</span>}
            </label>
          </div>
        </section>

        {/* Address (delivery only) */}
        {type === 'delivery' && (
          <section className="rounded-3xl border border-line bg-panel p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-beet">{t('addressTitle')}</h2>
            <div className="mt-3">
              <AddressFields value={address} onChange={setAddress} />
              {triedSubmit && !addressOk && <span className="mt-2 block text-xs font-medium text-brick">{t('addressRequired')}</span>}
            </div>
          </section>
        )}

        {/* Time */}
        <section className="rounded-3xl border border-line bg-panel p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-beet">{t('timeTitle')}</h2>
          <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-muted">
            {t('time')}
            <select value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className={inputCls}>
              {openNow && <option value="">{t('asap')}</option>}
              {slots.map((s) => (
                <option key={s.value} value={s.value}>{slotLabel(s)}</option>
              ))}
            </select>
          </label>
        </section>

        {/* Payment */}
        <section className="rounded-3xl border border-line bg-panel p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-beet">{t('paymentTitle')}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-line bg-paper p-1.5">
            {(['cash', 'card'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setPayment(opt)}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${payment === opt ? 'bg-beet text-paper' : 'text-ink/70 hover:text-ink'}`}
              >
                <Icon name={opt === 'cash' ? 'wallet' : 'card'} size={17} />
                {opt === 'cash' ? t('payCash') : t('payCard')}
              </button>
            ))}
          </div>
          {payment === 'cash' ? (
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-muted">
              {t('changeFrom')}
              <input value={changeFrom} onChange={(e) => setChangeFrom(e.target.value)} inputMode="decimal" placeholder={t('changePlaceholder')} className={inputCls} />
            </label>
          ) : (
            <p className="mt-3 text-xs font-medium text-muted">{t('paymentCardNote')}</p>
          )}
        </section>

        {/* Notes */}
        <section className="rounded-3xl border border-line bg-panel p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-beet">{t('notesTitle')}</h2>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={t('notesPlaceholder')} className={`${inputCls} resize-none`} />
        </section>
      </div>

      {/* Summary */}
      <div className="mt-6 rounded-3xl border border-line bg-panel p-5">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted">{t('subtotal')}</dt><dd className="font-semibold">{formatZloty(subtotal, locale)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">{type === 'pickup' ? t('pickup') : t('deliveryLine')}</dt><dd className="font-semibold">{fee === 0 ? t('free') : formatZloty(fee, locale)}</dd></div>
          <div className="mt-1 flex justify-between border-t border-line pt-3 text-base">
            <dt className="font-bold">{t('total')}</dt>
            <dd className="text-xl font-extrabold text-beet" style={{ fontFamily: 'var(--font-display)' }}>{formatZloty(total, locale)}</dd>
          </div>
        </dl>

        {!canCheckout && <p className="mt-3 text-sm font-semibold text-brick">{t('belowMin')}: {formatZloty(settings.minOrder, locale)}</p>}
        {error && <p className="mt-3 text-sm font-semibold text-brick">{error}</p>}

        <button
          type="button"
          disabled={submitting || !canCheckout}
          onClick={submit}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-beet px-4 py-3.5 text-base font-bold text-paper shadow-[0_10px_24px_-8px_rgba(164,18,63,.6)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-ink/40 disabled:shadow-none"
        >
          {submitting ? t('submitting') : `${t('submit')} · ${formatZloty(total, locale)}`}
        </button>
      </div>
    </div>
  )
}
