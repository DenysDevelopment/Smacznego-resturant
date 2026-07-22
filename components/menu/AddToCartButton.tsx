'use client'
import { useRef, useState } from 'react'
import { useCart } from '@/components/CartProvider'
import { Icon } from '@/components/Icon'
import { OptionSheet } from './OptionSheet'
import type { LocalizedDish } from '@/lib/menu/types'
import type { Locale } from '@/i18n/config'

export function AddToCartButton({ dish, locale }: { dish: LocalizedDish; locale: Locale }) {
  const { addItem, flyTo } = useCart()
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const hasOptions = dish.optionGroups.length > 0

  function onClick() {
    if (!dish.isAvailable) return
    if (hasOptions) { setOpen(true); return }
    addItem({ dishId: dish.id, name: dish.name, unitPrice: dish.basePrice, qty: 1, selectedOptions: [] })
    const holder = btnRef.current?.closest('article')?.querySelector<HTMLElement>('[data-dish-photo]')
    const img = holder?.querySelector('img')
    flyTo(holder ?? btnRef.current, img?.currentSrc ?? null)
  }

  return (
    <>
      <button ref={btnRef} type="button" aria-label={dish.name} disabled={!dish.isAvailable} onClick={onClick}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-beet text-paper shadow-[0_6px_14px_-6px_rgba(164,18,63,.7)] transition-transform hover:scale-110 active:scale-90 disabled:bg-ink/10 disabled:text-ink/30 disabled:shadow-none">
        <Icon name="plus" size={18} />
      </button>
      {open && <OptionSheet dish={dish} locale={locale} onClose={() => setOpen(false)} />}
    </>
  )
}
