import { Icon } from '@/components/Icon'
import { formatZloty } from '@/lib/menu/price'
import { courierActions } from '@/lib/orders/statusFlow'
import { orderNumber } from '@/lib/orders/format'
import { formatOrderAddress } from '@/lib/address/types'
import { StatusButton } from '@/components/admin/StatusButton'
import type { AdminOrder } from '@/lib/orders/adminOrders'

export function CourierCard({ order }: { order: AdminOrder }) {
  const addr = formatOrderAddress(order.address_snapshot) || '—'
  return (
    <article className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-center justify-between">
        <span className="font-extrabold text-beet">{orderNumber(order.public_token)}</span>
        <span className="text-lg font-extrabold text-beet">{formatZloty(order.total, 'pl')}</span>
      </div>
      <a href={`tel:${order.customer_phone}`} className="mt-3 flex items-center gap-2 text-base font-bold">
        <Icon name="phone" size={18} className="text-beet" />{order.customer_name} · {order.customer_phone}
      </a>
      <p className="mt-2 flex items-start gap-2 text-base"><Icon name="pin" size={18} className="mt-0.5 shrink-0 text-beet" />{addr}</p>
      <p className="mt-2 flex items-center gap-2 text-sm text-ink/80"><Icon name={order.payment_method === 'card' ? 'card' : 'wallet'} size={16} className="text-beet" />
        {order.payment_method === 'card'
          ? 'Картой — нужен терминал'
          : order.cash_change_from ? `Наличные · сдача с ${formatZloty(order.cash_change_from, 'pl')}` : 'Наличные'}
      </p>
      <ul className="mt-2 text-sm text-muted">
        {order.order_items.map((i, idx) => <li key={idx}>{i.qty}× {i.name}</li>)}
      </ul>
      <div className="mt-4 flex gap-2">
        {courierActions(order.status).map((a) => <StatusButton key={a.to} orderId={order.id} action={a} />)}
      </div>
    </article>
  )
}
