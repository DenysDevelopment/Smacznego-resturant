import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { formatZloty } from '@/lib/menu/price'
import { AddToCartButton } from './AddToCartButton'
import type { LocalizedDish } from '@/lib/menu/types'
import type { Locale } from '@/i18n/config'

export function DishCard({ dish, locale }: { dish: LocalizedDish; locale: Locale }) {
  const t = useTranslations('menu')
  const hasOptions = dish.optionGroups.length > 0
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-panel p-4 transition-shadow hover:shadow-[0_16px_36px_-18px_rgba(36,28,21,.5)] ${dish.isAvailable ? '' : 'opacity-55'}`}
    >
      <div data-dish-photo className="relative mx-auto aspect-square w-full max-w-[13rem]">
        {dish.photoUrl ? (
          <Image
            src={dish.photoUrl}
            alt={dish.name}
            fill
            sizes="(max-width: 640px) 45vw, 220px"
            className="object-contain drop-shadow-[0_14px_18px_rgba(36,28,21,.28)] transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full rounded-full bg-beet/10" />
        )}
        {!dish.isAvailable && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-8deg] rounded-full bg-brick px-3 py-1 text-xs font-bold text-paper shadow">
            {t('soldOut')}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-1 flex-col">
        <h3 className="flex flex-wrap items-center gap-2 text-base font-bold leading-snug">
          {dish.name}
          {hasOptions && dish.isAvailable && (
            <span className="rounded-full bg-mustard/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mustard">
              {dish.optionGroups[0].name}
            </span>
          )}
        </h3>
        {dish.description && <p className="mt-1 line-clamp-2 text-xs text-muted">{dish.description}</p>}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-lg font-extrabold text-beet" style={{ fontFamily: 'var(--font-display)' }}>
            {hasOptions ? `${t('from')} ` : ''}{formatZloty(dish.basePrice, locale)}
          </span>
          <AddToCartButton dish={dish} locale={locale} />
        </div>
      </div>
    </article>
  )
}
