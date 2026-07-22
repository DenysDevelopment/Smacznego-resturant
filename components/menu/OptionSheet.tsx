'use client'
import { useRef, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useCart } from '@/components/CartProvider'
import { Icon, type IconName } from '@/components/Icon'
import { dishPriceGrosze, formatZloty } from '@/lib/menu/price'
import type { LocalizedDish } from '@/lib/menu/types'
import type { SelectedOption } from '@/lib/cart/types'
import type { Locale } from '@/i18n/config'

// Best-effort food glyph for a side/add-on, matched across pl/uk/ru names.
function sideIcon(name: string): IconName | null {
  const n = name.toLowerCase()
  if (/frytk|фрі|фри/.test(n)) return 'fries'
  if (/ziemniak|картопл|картоф/.test(n)) return 'potato'
  if (/kasz|гречк|каш|ryż|рис|риж/.test(n)) return 'grain'
  if (/surów|sałat|салат/.test(n)) return 'salad'
  return null
}

export function OptionSheet({ dish, locale, onClose }: { dish: LocalizedDish; locale: Locale; onClose: () => void }) {
  const t = useTranslations('cart')
  const { addItem, flyTo } = useCart()
  const addBtnRef = useRef<HTMLButtonElement>(null)
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
    flyTo(addBtnRef.current, dish.photoUrl)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-panel text-ink shadow-2xl sm:max-h-[88vh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* scrollable content */}
        <div className="relative flex-1 overflow-y-auto px-5 pb-5">
          <button
            type="button"
            aria-label={t('remove')}
            onClick={onClose}
            className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-paper/70 text-ink backdrop-blur-sm transition-colors active:bg-ink/10"
          >
            <Icon name="close" size={22} />
          </button>

          {/* big appetite-first photo */}
          {dish.photoUrl && (
            <div className="relative mx-auto flex h-44 items-center justify-center pt-3">
              <div className="absolute h-36 w-36 rounded-full bg-beet/10" />
              <div className="relative h-36 w-36">
                <Image src={dish.photoUrl} alt="" fill sizes="144px" className="object-contain drop-shadow-[0_18px_24px_rgba(36,28,21,.3)]" />
              </div>
            </div>
          )}

          <h3 className="mt-1 text-center text-2xl font-extrabold leading-tight tracking-tight">{dish.name}</h3>
          {dish.description && <p className="mt-1 text-center text-sm text-muted">{dish.description}</p>}

          {/* option groups */}
          {dish.optionGroups.map((g) => {
            const single = g.maxSelect === 1
            return (
              <fieldset key={g.id} className="mt-5">
                <legend className="mb-2 flex items-baseline gap-2 text-sm font-bold uppercase tracking-widest text-beet">
                  {g.name}
                  {g.required && <span className="text-[10px] font-semibold normal-case tracking-normal text-muted">· {t('required')}</span>}
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {g.options.map((o) => {
                    const isOn = selected[g.id]?.has(o.id) ?? false
                    const ico = sideIcon(o.name)
                    return (
                      <button
                        key={o.id}
                        type="button"
                        role={single ? 'radio' : 'checkbox'}
                        aria-checked={isOn}
                        onClick={() => toggle(g.id, o.id, single)}
                        className={`flex min-h-[3.5rem] items-center gap-2.5 rounded-2xl border-2 p-3 text-left transition-colors ${isOn ? 'border-beet bg-beet/5' : 'border-line bg-paper active:border-beet/40'}`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isOn ? 'bg-beet text-paper' : 'bg-beet/10 text-beet'}`}>
                          {ico ? <Icon name={ico} size={20} /> : isOn ? <Icon name="check" size={18} /> : <span className="h-2 w-2 rounded-full bg-beet" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold leading-tight">{o.name}</span>
                          <span className="mt-0.5 block text-xs text-muted">{o.priceDelta > 0 ? `+${formatZloty(o.priceDelta, locale)}` : t('free')}</span>
                        </span>
                        {isOn && <Icon name="check" size={16} className="shrink-0 text-beet" />}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            )
          })}
        </div>

        {/* sticky footer: qty + add (thumb reach) */}
        <div className="border-t border-line bg-panel px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wide text-muted">{t('qty')}</span>
            <div className="flex items-center gap-3">
              <button type="button" aria-label="dec" className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-xl leading-none transition-colors active:border-beet active:text-beet" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <span className="w-6 text-center text-base font-bold tabular-nums">{qty}</span>
              <button type="button" aria-label="inc" className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-xl leading-none transition-colors active:border-beet active:text-beet" onClick={() => setQty((q) => q + 1)}>+</button>
            </div>
          </div>
          <button
            ref={addBtnRef}
            type="button"
            disabled={!requiredOk}
            onClick={add}
            className="flex w-full items-center justify-between rounded-2xl bg-beet px-5 py-4 text-base font-bold text-paper shadow-[0_10px_24px_-8px_rgba(164,18,63,.6)] transition-transform active:scale-[.98] disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-ink/40 disabled:shadow-none"
          >
            <span>{t('add')}</span>
            <span>{formatZloty(unitPrice * qty, locale)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
