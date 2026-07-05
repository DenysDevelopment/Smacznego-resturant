'use client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useCart } from '@/components/CartProvider'
import { useSettings } from '@/components/SettingsProvider'
import { formatZloty } from '@/lib/menu/price'
import { meetsMinOrder, amountToFreeDelivery } from '@/lib/cart/totals'
import { Icon } from '@/components/Icon'
import type { Locale } from '@/i18n/config'

export function CartView({ locale }: { locale: Locale }) {
  const t = useTranslations('cart')
  const settings = useSettings()
  const { items, subtotal, setQty, removeItem, keyOf } = useCart()

  if (items.length === 0) return <p className="p-8 text-center text-muted">{t('empty')}</p>

  const canCheckout = meetsMinOrder(subtotal, settings)
  const toFree = amountToFreeDelivery(subtotal, settings)

  return (
    <div className="mx-auto max-w-lg px-4 pb-28">
      {items.map((i) => {
        const key = keyOf(i)
        return (
          <div key={key} className="flex gap-3 border-b border-line py-3">
            <div className="flex-1">
              <h3 className="text-sm">{i.name}</h3>
              {i.selectedOptions.length > 0 && (
                <p className="text-xs text-muted">{i.selectedOptions.map((o) => o.optionName).join(', ')}</p>
              )}
              <div className="mt-1 flex items-center gap-3">
                <button aria-label="dec" className="h-7 w-7 rounded-lg border border-line" onClick={() => setQty(key, i.qty - 1)}>−</button>
                <span className="w-5 text-center text-sm">{i.qty}</span>
                <button aria-label="inc" className="h-7 w-7 rounded-lg border border-line" onClick={() => setQty(key, i.qty + 1)}>+</button>
                <button aria-label={t('remove')} className="ml-2 text-muted" onClick={() => removeItem(key)}><Icon name="trash" size={14} /></button>
              </div>
            </div>
            <span className="text-sm font-bold text-gold">{formatZloty(i.unitPrice * i.qty, locale)}</span>
          </div>
        )
      })}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-muted">{t('subtotal')}</span>
        <span className="text-lg font-bold text-gold">{formatZloty(subtotal, locale)}</span>
      </div>
      {toFree > 0 && <p className="mt-1 text-xs text-muted">{formatZloty(toFree, locale)} {t('toFree')}</p>}
      {!canCheckout && <p className="mt-1 text-xs text-danger">{t('minOrder')}: {formatZloty(settings.minOrder, locale)}</p>}

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-lg p-4">
        <Link href={`/${locale}/checkout`} aria-disabled={!canCheckout}
          onClick={(e) => { if (!canCheckout) e.preventDefault() }}
          className={`flex items-center justify-center rounded-xl px-4 py-3 font-bold ${canCheckout ? 'bg-gold text-espresso' : 'bg-surface text-muted'}`}>
          {t('checkout')} · {formatZloty(subtotal, locale)}
        </Link>
      </div>
    </div>
  )
}
