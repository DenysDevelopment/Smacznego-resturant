import Link from 'next/link'
import { requireRole } from '@/lib/auth/require'
import { listDishesForAdmin } from '@/lib/menu/admin/queries'
import { MenuBrowser } from '@/components/admin/menu/MenuBrowser'

export const dynamic = 'force-dynamic'

export default async function AdminMenuPage() {
  await requireRole('staff')
  const categories = await listDishesForAdmin()
  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Меню</h1>
        <Link
          href="/admin/menu/new"
          className="rounded-full bg-beet px-5 py-2.5 text-sm font-bold text-paper"
        >
          + Новое блюдо
        </Link>
      </div>
      <MenuBrowser categories={categories} />
    </main>
  )
}
