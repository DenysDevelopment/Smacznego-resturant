import Link from 'next/link'
import Image from 'next/image'
import { formatZloty } from '@/lib/menu/price'
import { DeleteButton } from './DeleteButton'
import type { AdminCategoryGroup } from '@/lib/menu/admin/queries'

export function MenuGallery({ categories }: { categories: AdminCategoryGroup[] }) {
  return (
    <div className="space-y-8">
      {categories.map((cat) => (
        <section key={cat.id}>
          <h2 className="mb-3 text-lg font-extrabold tracking-tight">{cat.namePl}</h2>
          {cat.dishes.length === 0 ? (
            <p className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm text-muted">Нет блюд в категории</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {cat.dishes.map((dish) => (
                <div
                  key={dish.id}
                  className="group overflow-hidden rounded-2xl border border-line bg-panel"
                >
                  <Link href={`/admin/menu/${dish.id}`} className="block">
                    <div className="relative aspect-square bg-ink/5">
                      {dish.photoUrl ? (
                        <Image
                          src={dish.photoUrl}
                          alt={dish.namePl}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                          className="object-cover transition-transform group-hover:scale-[1.03]"
                          unoptimized={dish.photoUrl.startsWith('http')}
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-xs text-muted">нет фото</span>
                      )}
                      {!dish.isAvailable && (
                        <span className="absolute left-2 top-2 rounded-full bg-brick px-2 py-0.5 text-[11px] font-bold text-paper">
                          Стоп-лист
                        </span>
                      )}
                      {dish.optionGroupCount > 0 && (
                        <span className="absolute right-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] font-bold text-paper">
                          Опции: {dish.optionGroupCount}
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-start justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <Link href={`/admin/menu/${dish.id}`} className="block truncate font-semibold hover:text-beet">
                        {dish.namePl}
                      </Link>
                      <span className="text-sm text-muted">{formatZloty(dish.basePrice, 'ru')}</span>
                    </div>
                    <DeleteButton
                      kind="dish"
                      id={dish.id}
                      confirmText={`Удалить блюдо «${dish.namePl}»? Действие необратимо.`}
                      small
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
