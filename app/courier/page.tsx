import { listCourierQueue } from '@/lib/orders/adminOrders'
import { requireRole } from '@/lib/auth/require'
import { CourierCard } from '@/components/courier/CourierCard'
import { OrderStream } from '@/components/admin/OrderStream'

export const dynamic = 'force-dynamic'

export default async function CourierPage() {
  await requireRole('courier')
  const queue = await listCourierQueue()
  const ready = queue.filter((o) => o.status === 'ready')
  const enRoute = queue.filter((o) => o.status === 'out_for_delivery')
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Курьер</h1>
        <OrderStream role="courier" />
      </div>
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-muted">К доставке ({ready.length})</h2>
        <div className="space-y-3">{ready.length ? ready.map((o) => <CourierCard key={o.id} order={o} />) : <p className="text-sm text-muted">Нет готовых заказов</p>}</div>
      </section>
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-muted">В пути ({enRoute.length})</h2>
        <div className="space-y-3">{enRoute.map((o) => <CourierCard key={o.id} order={o} />)}</div>
      </section>
    </main>
  )
}
