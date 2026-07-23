import { OrderCard } from './OrderCard'
import { CompletedTimer } from './CompletedTimer'
import { warsawNextMidnightUtc, warsawGmtLabel } from '@/lib/time/warsaw'
import type { AdminOrder } from '@/lib/orders/adminOrders'
import type { OrderStatus } from '@/lib/orders/statusFlow'

const LANES: { title: string; statuses: OrderStatus[]; resetsDaily?: boolean }[] = [
  { title: 'Новые', statuses: ['pending'] },
  { title: 'Приняты', statuses: ['confirmed'] },
  { title: 'Готовятся', statuses: ['preparing'] },
  { title: 'Готовы', statuses: ['ready'] },
  { title: 'В доставке', statuses: ['out_for_delivery'] },
  { title: 'Завершены', statuses: ['delivered', 'picked_up', 'cancelled', 'rejected'], resetsDaily: true },
]

export function OrderBoard({ orders }: { orders: AdminOrder[] }) {
  const nextReset = warsawNextMidnightUtc(new Date()).toISOString()
  const gmtLabel = warsawGmtLabel(new Date())
  return (
    <div className="space-y-5">
      {LANES.map((lane) => {
        const cards = orders.filter((o) => lane.statuses.includes(o.status))
        const empty = cards.length === 0
        return (
          <section key={lane.title} className={empty ? 'opacity-60' : ''}>
            <h2 className="mb-2.5 flex items-center gap-2 border-b border-line pb-1.5 text-sm font-bold uppercase tracking-widest text-muted">
              {lane.title}
              <span className={`rounded-full px-2 text-xs ${empty ? 'bg-line' : 'bg-beet text-paper'}`}>{cards.length}</span>
              {lane.resetsDaily && <CompletedTimer nextResetIso={nextReset} gmtLabel={gmtLabel} />}
            </h2>
            {empty
              ? <p className="text-sm text-muted">—</p>
              : (
                <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {cards.map((o) => <OrderCard key={o.id} order={o} />)}
                </div>
              )}
          </section>
        )
      })}
    </div>
  )
}
