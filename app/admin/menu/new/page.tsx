import { requireRole } from '@/lib/auth/require'
import { listCategoriesForSelect } from '@/lib/menu/admin/queries'
import { DishForm } from '@/components/admin/menu/DishForm'

export const dynamic = 'force-dynamic'

export default async function NewDishPage() {
  await requireRole('staff')
  const categories = await listCategoriesForSelect()
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">Новое блюдо</h1>
      <DishForm categories={categories} initial={null} />
    </main>
  )
}
