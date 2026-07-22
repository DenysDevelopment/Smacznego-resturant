'use client'
import type { LocalizedCategory } from '@/lib/menu/types'

export function CategoryNav({ categories }: { categories: LocalizedCategory[] }) {
  return (
    <nav className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {categories.map((c) => (
        <a
          key={c.id}
          href={`#cat-${c.id}`}
          className="whitespace-nowrap rounded-full border border-line px-4 py-1.5 text-sm font-semibold text-ink/70 transition-colors hover:border-beet hover:bg-beet hover:text-paper"
        >
          {c.name}
        </a>
      ))}
    </nav>
  )
}
