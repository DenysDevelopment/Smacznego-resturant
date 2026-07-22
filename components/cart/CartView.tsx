'use client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useCart } from '@/components/CartProvider'
import { useSettings } from '@/components/SettingsProvider'
import { formatZloty } from '@/lib/menu/price'
import { deliveryFee, meetsMinOrder, amountToFreeDelivery } from '@/lib/cart/totals'
import { Icon } from '@/components/Icon'
import type { Locale } from '@/i18n/config'

export function CartView({ locale }: { locale: Locale }) {
  const t = useTranslations('cart')
  const settings = useSettings()
  const { items, subtotal, setQty, removeItem, keyOf } = useCart()

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center">
        <p className="text-lg text-muted">{t('empty')}</p>
        <Link href={`/${locale}/menu`} className="mt-6 inline-block rounded-full bg-beet px-6 py-3 text-sm font-bold text-paper transition-transform hover:-translate-y-0.5">
          {t('toMenu')}
        </Link>
      </div>
    )
  }

  const canCheckout = meetsMinOrder(subtotal, settings)
  const fee = deliveryFee(subtotal, 'delivery', settings)
  const total = subtotal + fee
  const toFree = amountToFreeDelivery(subtotal, settings)
  const freeProgress = Math.min(100, Math.round((subtotal / settings.freeDeliveryThreshold) * 100))

  return (
    <div className="mx-auto max-w-2xl px-5 pb-16">
      <h1 className="pt-8 text-4xl font-extrabold tracking-tight sm:text-5xl">{t('title')}</h1>

      <ul className="mt-6">
        {items.map((i) => {
          const key = keyOf(i)
          return (
            <li key={key} className="flex items-start gap-4 border-b border-line py-4">
              <div className="flex-1">
                <h3 className="text-base font-bold leading-snug">{i.name}</h3>
                {i.selectedOptions.length > 0 && (
                  <p className="mt-0.5 text-xs text-muted">{i.selectedOptions.map((o) => o.optionName).join(', ')}</p>
                )}
                <div className="mt-2.5 flex items-center gap-2">
                  <button aria-label="dec" className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-xl leading-none transition-colors hover:border-beet hover:text-beet active:border-beet active:text-beet" onClick={() => setQty(key, i.qty - 1)}>−</button>
                  <span className="w-6 text-center text-base font-bold tabular-nums">{i.qty}</span>
                  <button aria-label="inc" className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-xl leading-none transition-colors hover:border-beet hover:text-beet active:border-beet active:text-beet" onClick={() => setQty(key, i.qty + 1)}>+</button>
                  <button aria-label={t('remove')} className="ml-1 flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-brick/10 hover:text-brick active:bg-brick/10" onClick={() => removeItem(key)}><Icon name="trash" size={16} /></button>
                </div>
              </div>
              <span className="pt-0.5 text-base font-extrabold text-beet" style={{ fontFamily: 'var(--font-display)' }}>
                {formatZloty(i.unitPrice * i.qty, locale)}
              </span>
            </li>
          )
        })}
      </ul>

      {/* free-delivery progress */}
      {toFree > 0 && (
        <div className="mt-6">
          <p className="text-sm text-muted">
            {t('addForFree', { amount: formatZloty(toFree, locale) })}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-mustard transition-all" style={{ width: `${freeProgress}%` }} />
          </div>
        </div>
      )}

      {/* summary */}
      <div className="mt-6 rounded-3xl border border-line bg-panel p-5">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{t('subtotal')}</dt>
            <dd className="font-semibold">{formatZloty(subtotal, locale)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{t('deliveryLine')}</dt>
            <dd className="font-semibold">{fee === 0 ? t('free') : formatZloty(fee, locale)}</dd>
          </div>
          <div className="mt-1 flex justify-between border-t border-line pt-3 text-base">
            <dt className="font-bold">{t('total')}</dt>
            <dd className="text-xl font-extrabold text-beet" style={{ fontFamily: 'var(--font-display)' }}>{formatZloty(total, locale)}</dd>
          </div>
        </dl>

        {!canCheckout && (
          <p className="mt-3 text-sm font-semibold text-brick">
            {t('minOrder')}: {formatZloty(settings.minOrder, locale)}
          </p>
        )}

        <Link
          href={`/${locale}/checkout`}
          aria-disabled={!canCheckout}
          onClick={(e) => { if (!canCheckout) e.preventDefault() }}
          className={`mt-4 flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-base font-bold transition-transform ${canCheckout ? 'bg-beet text-paper shadow-[0_10px_24px_-8px_rgba(164,18,63,.6)] hover:-translate-y-0.5' : 'cursor-not-allowed bg-ink/10 text-ink/40'}`}
        >
          {t('checkout')} · {formatZloty(total, locale)}
        </Link>
      </div>
    </div>
  )
}
