import { DishCard } from './DishCard'
import type { LocalizedCategory } from '@/lib/menu/types'
import type { Locale } from '@/i18n/config'

export function MenuList({ categories, locale }: { categories: LocalizedCategory[]; locale: Locale }) {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-24">
      {categories.map((c) => (
        <section key={c.id} id={`cat-${c.id}`} className="scroll-mt-24 pt-8">
          <div className="mb-5 flex items-baseline gap-3">
            <h2 className="text-3xl font-extrabold tracking-tight">{c.name}</h2>
            <span className="h-px flex-1 bg-line" />
            <span className="text-sm font-semibold text-muted">{c.dishes.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {c.dishes.map((d) => (
              <DishCard key={d.id} dish={d} locale={locale} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
