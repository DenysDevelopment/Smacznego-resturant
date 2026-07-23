import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/require'
import { getDishForEdit, listCategoriesForSelect } from '@/lib/menu/admin/queries'
import { DishForm } from '@/components/admin/menu/DishForm'
import { OptionsSection } from '@/components/admin/menu/OptionsSection'
import { DeleteButton } from '@/components/admin/menu/DeleteButton'

export const dynamic = 'force-dynamic'

export default async function EditDishPage({ params }: { params: Promise<{ dishId: string }> }) {
  await requireRole('staff')
  const { dishId } = await params
  const [dish, categories] = await Promise.all([getDishForEdit(dishId), listCategoriesForSelect()])
  if (!dish) notFound()
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/menu" className="text-sm font-semibold text-muted hover:text-ink">← Меню</Link>
          <h1 className="text-3xl font-extrabold tracking-tight">{dish.name.pl ?? 'Блюдо'}</h1>
        </div>
        <DeleteButton
          kind="dish"
          id={dish.id}
          confirmText={`Удалить блюдо «${dish.name.pl ?? ''}»? Действие необратимо.`}
          redirectTo="/admin/menu"
        />
      </div>
      <DishForm categories={categories} initial={dish} />
      <OptionsSection dishId={dish.id} groups={dish.option_groups} />
    </main>
  )
}
