import { DishCard } from './DishCard'
import type { LocalizedCategory } from '@/lib/menu/types'
import type { Locale } from '@/i18n/config'

export function MenuList({ categories, locale }: { categories: LocalizedCategory[]; locale: Locale }) {
  return (
    <div>
      {categories.map((c) => (
        <section key={c.id} id={`cat-${c.id}`} className="mb-6">
          <h2 className="mb-1 text-xl">{c.name}</h2>
          {c.dishes.map((d) => (
            <DishCard key={d.id} dish={d} locale={locale} />
          ))}
        </section>
      ))}
    </div>
  )
}
