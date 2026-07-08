import { OrderCard } from './OrderCard'
import type { AdminOrder } from '@/lib/orders/adminOrders'
import type { OrderStatus } from '@/lib/orders/statusFlow'

const LANES: { title: string; statuses: OrderStatus[] }[] = [
  { title: 'Новые', statuses: ['pending'] },
  { title: 'Приняты', statuses: ['confirmed'] },
  { title: 'Готовятся', statuses: ['preparing'] },
  { title: 'Готовы', statuses: ['ready'] },
  { title: 'В доставке', statuses: ['out_for_delivery'] },
  { title: 'Завершены', statuses: ['delivered', 'picked_up', 'cancelled', 'rejected'] },
]

export function OrderBoard({ orders }: { orders: AdminOrder[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {LANES.map((lane) => {
        const cards = orders.filter((o) => lane.statuses.includes(o.status))
        return (
          <section key={lane.title}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted">
              {lane.title} <span className="rounded-full bg-line px-2 text-xs">{cards.length}</span>
            </h2>
            <div className="space-y-3">
              {cards.length === 0
                ? <p className="text-sm text-muted">—</p>
                : cards.map((o) => <OrderCard key={o.id} order={o} />)}
            </div>
          </section>
        )
      })}
    </div>
  )
}
