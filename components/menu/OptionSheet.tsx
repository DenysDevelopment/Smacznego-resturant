'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useCart } from '@/components/CartProvider'
import { dishPriceGrosze, formatZloty } from '@/lib/menu/price'
import type { LocalizedDish } from '@/lib/menu/types'
import type { SelectedOption } from '@/lib/cart/types'
import type { Locale } from '@/i18n/config'

export function OptionSheet({ dish, locale, onClose }: { dish: LocalizedDish; locale: Locale; onClose: () => void }) {
  const t = useTranslations('cart')
  const { addItem } = useCart()
  const [selected, setSelected] = useState<Record<string, Set<string>>>({})
  const [qty, setQty] = useState(1)

  function toggle(groupId: string, optionId: string, single: boolean) {
    setSelected((prev) => {
      const set = new Set(single ? [] : prev[groupId] ?? [])
      if (single) set.add(optionId)
      else set.has(optionId) ? set.delete(optionId) : set.add(optionId)
      return { ...prev, [groupId]: set }
    })
  }

  const chosen: SelectedOption[] = dish.optionGroups.flatMap((g) =>
    [...(selected[g.id] ?? [])].map((optId) => {
      const opt = g.options.find((o) => o.id === optId)!
      return { groupId: g.id, groupName: g.name, optionId: opt.id, optionName: opt.name, priceDelta: opt.priceDelta }
    }),
  )
  const requiredOk = dish.optionGroups.every((g) => !g.required || (selected[g.id]?.size ?? 0) >= g.minSelect)
  const unitPrice = dishPriceGrosze(dish.basePrice, chosen)

  function add() {
    addItem({ dishId: dish.id, name: dish.name, unitPrice, qty, selectedOptions: chosen })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-2xl bg-surface p-5 text-cream" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-lg">{dish.name}</h3>
        {dish.optionGroups.map((g) => (
          <fieldset key={g.id} className="mb-4">
            <legend className="mb-1 text-sm text-muted">
              {g.name}{g.required && <span className="ml-1 text-gold">· {t('required')}</span>}
            </legend>
            {g.options.map((o) => {
              const single = g.maxSelect === 1
              const isOn = selected[g.id]?.has(o.id) ?? false
              return (
                <label key={o.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="flex items-center gap-2">
                    <input type={single ? 'radio' : 'checkbox'} name={g.id} checked={isOn}
                      onChange={() => toggle(g.id, o.id, single)} />
                    {o.name}
                  </span>
                  {o.priceDelta > 0 && <span className="text-muted">+{formatZloty(o.priceDelta, locale)}</span>}
                </label>
              )
            })}
          </fieldset>
        ))}
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm text-muted">{t('qty')}</span>
          <button type="button" className="h-8 w-8 rounded-lg border border-line" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
          <span className="w-6 text-center">{qty}</span>
          <button type="button" className="h-8 w-8 rounded-lg border border-line" onClick={() => setQty((q) => q + 1)}>+</button>
        </div>
        <button type="button" disabled={!requiredOk} onClick={add}
          className="flex w-full items-center justify-between rounded-xl bg-gold px-4 py-3 font-bold text-espresso disabled:opacity-40">
          <span>{t('add')}</span><span>{formatZloty(unitPrice * qty, locale)}</span>
        </button>
      </div>
    </div>
  )
}
