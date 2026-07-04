import { useTranslations } from 'next-intl'
import { Icon } from '@/components/Icon'
import { formatZloty } from '@/lib/menu/price'
import type { LocalizedDish } from '@/lib/menu/types'
import type { Locale } from '@/i18n/config'

export function DishCard({ dish, locale }: { dish: LocalizedDish; locale: Locale }) {
  const t = useTranslations('menu')
  const hasOptions = dish.optionGroups.length > 0
  return (
    <article className={`flex gap-3 border-b border-line py-3 ${dish.isAvailable ? '' : 'opacity-45'}`}>
      <div className="h-16 w-16 flex-none rounded-xl bg-[radial-gradient(90%_90%_at_60%_70%,#7a3a12,#2a1408)]" />
      <div className="flex-1">
        <h3 className="flex flex-wrap items-center gap-2 text-sm">
          {dish.name}
          {hasOptions && dish.isAvailable && (
            <span className="rounded-md bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
              {dish.optionGroups[0].name}
            </span>
          )}
          {!dish.isAvailable && (
            <span className="rounded-md bg-danger/15 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
              {t('soldOut')}
            </span>
          )}
        </h3>
        {dish.description && <p className="mt-0.5 text-xs text-muted">{dish.description}</p>}
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-sm font-bold text-gold">
            {hasOptions ? `${t('from')} ` : ''}{formatZloty(dish.basePrice, locale)}
          </span>
          <button
            type="button"
            aria-label="add"
            disabled={!dish.isAvailable}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold text-espresso disabled:bg-surface disabled:text-muted"
          >
            <Icon name="plus" size={15} />
          </button>
        </div>
      </div>
    </article>
  )
}
