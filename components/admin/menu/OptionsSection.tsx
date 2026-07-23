'use client'
import { useState } from 'react'
import { OptionGroupEditor } from './OptionGroupEditor'
import type { AdminOptionGroupRaw } from '@/lib/menu/admin/queries'

export function OptionsSection({ dishId, groups }: { dishId: string; groups: AdminOptionGroupRaw[] }) {
  const [addingGroup, setAddingGroup] = useState(false)
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xl font-extrabold tracking-tight">Опции</h2>
      <div className="space-y-4">
        {groups.map((g) => (
          <OptionGroupEditor key={g.id} dishId={dishId} initial={g} />
        ))}
        {addingGroup ? (
          <OptionGroupEditor dishId={dishId} initial={null} onDone={() => setAddingGroup(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setAddingGroup(true)}
            className="rounded-full border border-line px-5 py-2 text-sm font-bold text-ink/70 hover:bg-ink hover:text-paper"
          >
            + Группа опций
          </button>
        )}
      </div>
    </section>
  )
}
