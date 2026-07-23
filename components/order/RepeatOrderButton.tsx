'use client'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCart } from '@/components/CartProvider'
import { Icon } from '@/components/Icon'
import type { CartItem } from '@/lib/cart/types'
import type { Locale } from '@/i18n/config'

/** Re-adds this order's still-available dishes to the cart and opens the cart. */
export function RepeatOrderButton({ locale, items }: { locale: Locale; items: CartItem[] }) {
  const t = useTranslations('order.menu')
  const router = useRouter()
  const { addItem } = useCart()

  const repeatable = items.filter((i) => i.dishId)
  const canRepeat = repeatable.length > 0

  function repeat() {
    for (const i of repeatable) {
      addItem({ dishId: i.dishId, name: i.name, unitPrice: i.unitPrice, qty: i.qty, selectedOptions: i.selectedOptions })
    }
    router.push(`/${locale}/cart`)
  }

  return (
    <button
      type="button"
      disabled={!canRepeat}
      onClick={repeat}
      title={canRepeat ? undefined : t('repeatUnavailable')}
      className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-beet px-4 py-3.5 text-sm font-bold text-paper shadow-[0_10px_24px_-8px_rgba(164,18,63,.6)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-ink/40 disabled:shadow-none"
    >
      <Icon name="receipt" size={18} />{canRepeat ? t('repeat') : t('repeatUnavailable')}
    </button>
  )
}
