'use client'
import type { LocalizedCategory } from '@/lib/menu/types'

export function CategoryNav({ categories }: { categories: LocalizedCategory[] }) {
  return (
    <nav className="flex gap-2 overflow-x-auto py-3">
      {categories.map((c) => (
        <a
          key={c.id}
          href={`#cat-${c.id}`}
          className="whitespace-nowrap rounded-full border border-line px-3 py-1.5 text-xs text-muted"
        >
          {c.name}
        </a>
      ))}
    </nav>
  )
}
