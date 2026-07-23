'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCart } from '@/components/CartProvider'
import { Icon } from '@/components/Icon'
import { orderableDishIds } from '@/lib/orders/reorder'
import type { CartItem } from '@/lib/cart/types'
import type { Locale } from '@/i18n/config'

/** Re-adds this order's still-orderable dishes to the cart and opens the cart. */
export function RepeatOrderButton({ locale, items }: { locale: Locale; items: CartItem[] }) {
  const t = useTranslations('order.menu')
  const router = useRouter()
  const { addItem } = useCart()
  const [pending, start] = useTransition()
  const [unavailable, setUnavailable] = useState<string[] | null>(null)

  const repeatable = items.filter((i) => i.dishId)
  const canRepeat = repeatable.length > 0

  function repeat() {
    setUnavailable(null)
    start(async () => {
      // check current availability so a guest can't re-add sold-out / removed dishes
      const ok = new Set(await orderableDishIds(repeatable.map((i) => i.dishId)))
      const toAdd = repeatable.filter((i) => ok.has(i.dishId))
      const missing = repeatable.filter((i) => !ok.has(i.dishId))

      for (const i of toAdd) {
        addItem({ dishId: i.dishId, name: i.name, unitPrice: i.unitPrice, qty: i.qty, selectedOptions: i.selectedOptions })
      }

      if (missing.length === 0) {
        router.push(`/${locale}/cart`)
        return
      }
      // some (or all) items unavailable — surface them instead of silently dropping
      setUnavailable(missing.map((i) => i.name))
    })
  }

  const addedSomething = unavailable !== null && unavailable.length < repeatable.length

  return (
    <div className="mt-8">
      <button
        type="button"
        disabled={!canRepeat || pending}
        onClick={repeat}
        title={canRepeat ? undefined : t('repeatUnavailable')}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-beet px-4 py-3.5 text-sm font-bold text-paper shadow-[0_10px_24px_-8px_rgba(164,18,63,.6)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-ink/40 disabled:shadow-none"
      >
        <Icon name="receipt" size={18} />
        {pending ? t('repeatChecking') : canRepeat ? t('repeat') : t('repeatUnavailable')}
      </button>

      {unavailable && unavailable.length > 0 && (
        <div className="mt-3 rounded-2xl border border-brick/30 bg-brick/5 p-4 text-sm">
          <p className="flex items-center gap-2 font-bold text-brick">
            <Icon name="close" size={16} />
            {addedSomething ? t('reorderSomeUnavailable') : t('reorderNoneAvailable')}
          </p>
          <ul className="mt-2 list-disc pl-5 text-ink/80">
            {unavailable.map((name, idx) => (
              <li key={idx}>{name}</li>
            ))}
          </ul>
          {addedSomething && (
            <button
              type="button"
              onClick={() => router.push(`/${locale}/cart`)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-beet px-4 py-2 text-xs font-bold text-paper"
            >
              {t('goToCart')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
