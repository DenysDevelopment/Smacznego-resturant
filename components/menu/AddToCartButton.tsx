'use client'
import { useState } from 'react'
import { useCart } from '@/components/CartProvider'
import { Icon } from '@/components/Icon'
import { OptionSheet } from './OptionSheet'
import type { LocalizedDish } from '@/lib/menu/types'
import type { Locale } from '@/i18n/config'

export function AddToCartButton({ dish, locale }: { dish: LocalizedDish; locale: Locale }) {
  const { addItem } = useCart()
  const [open, setOpen] = useState(false)
  const hasOptions = dish.optionGroups.length > 0

  function onClick() {
    if (!dish.isAvailable) return
    if (hasOptions) setOpen(true)
    else addItem({ dishId: dish.id, name: dish.name, unitPrice: dish.basePrice, qty: 1, selectedOptions: [] })
  }

  return (
    <>
      <button type="button" aria-label={dish.name} disabled={!dish.isAvailable} onClick={onClick}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold text-espresso disabled:bg-surface disabled:text-muted">
        <Icon name="plus" size={15} />
      </button>
      {open && <OptionSheet dish={dish} locale={locale} onClose={() => setOpen(false)} />}
    </>
  )
}
