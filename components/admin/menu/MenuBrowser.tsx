'use client'
import { useEffect, useState } from 'react'
import { MenuList } from './MenuList'
import { MenuGallery } from './MenuGallery'
import type { AdminCategoryGroup } from '@/lib/menu/admin/queries'

type View = 'list' | 'gallery'
const STORAGE_KEY = 'admin-menu-view'

export function MenuBrowser({ categories }: { categories: AdminCategoryGroup[] }) {
  // default to the text list; remember the last choice across visits
  const [view, setView] = useState<View>('list')
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'gallery' || saved === 'list') setView(saved)
  }, [])

  function choose(next: View) {
    setView(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  const tabCls = (active: boolean) =>
    `flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
      active ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-ink/10'
    }`

  return (
    <div>
      <div className="mb-4 inline-flex gap-1 rounded-full border border-line bg-panel p-1">
        <button type="button" onClick={() => choose('list')} className={tabCls(view === 'list')}>
          <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
          Список
        </button>
        <button type="button" onClick={() => choose('gallery')} className={tabCls(view === 'gallery')}>
          <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Галерея
        </button>
      </div>

      {view === 'gallery' ? <MenuGallery categories={categories} /> : <MenuList categories={categories} />}
    </div>
  )
}
