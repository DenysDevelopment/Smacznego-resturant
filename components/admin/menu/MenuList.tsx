import Link from 'next/link'
import { formatZloty } from '@/lib/menu/price'
import { DeleteButton } from './DeleteButton'
import type { AdminCategoryGroup } from '@/lib/menu/admin/queries'

export function MenuList({ categories }: { categories: AdminCategoryGroup[] }) {
  return (
    <div className="space-y-8">
      {categories.map((cat) => (
        <section key={cat.id}>
          <h2 className="mb-3 text-lg font-extrabold tracking-tight">{cat.namePl}</h2>
          <div className="overflow-hidden rounded-2xl border border-line bg-panel">
            {cat.dishes.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted">Нет блюд в категории</p>
            )}
            {cat.dishes.map((dish, i) => (
              <div
                key={dish.id}
                className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 ${i > 0 ? 'border-t border-line' : ''}`}
              >
                <div className="flex min-w-0 flex-1 items-baseline gap-3">
                  <span className="min-w-0 truncate font-semibold">{dish.namePl}</span>
                  <span className="shrink-0 text-sm text-muted">{formatZloty(dish.basePrice, 'ru')}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {dish.isHidden && (
                    <span className="rounded-full bg-ink/10 px-2.5 py-0.5 text-xs font-bold text-ink/70">Убрано с сайта</span>
                  )}
                  {!dish.isHidden && !dish.isAvailable && (
                    <span className="rounded-full bg-brick/10 px-2.5 py-0.5 text-xs font-bold text-brick">Нет в наличии</span>
                  )}
                  {dish.optionGroupCount > 0 && (
                    <span className="rounded-full bg-mustard/15 px-2.5 py-0.5 text-xs font-bold text-mustard">
                      Опции: {dish.optionGroupCount}
                    </span>
                  )}
                  <Link
                    href={`/admin/menu/${dish.id}`}
                    className="rounded-full border border-line px-4 py-1.5 text-sm font-semibold hover:bg-ink hover:text-paper"
                  >
                    Изменить
                  </Link>
                  <DeleteButton
                    kind="dish"
                    id={dish.id}
                    confirmText={`Удалить блюдо «${dish.namePl}»? Действие необратимо.`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
