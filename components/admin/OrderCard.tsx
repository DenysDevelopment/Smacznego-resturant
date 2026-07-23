import { Icon } from '@/components/Icon'
import { formatZloty } from '@/lib/menu/price'
import { STATUS_LABEL_RU, operatorActions } from '@/lib/orders/statusFlow'
import { orderNumber, formatOrderTime, formatScheduledFor } from '@/lib/orders/format'
import { formatOrderAddress } from '@/lib/address/types'
import { StatusButton } from './StatusButton'
import { DeleteOrderButton } from './DeleteOrderButton'
import type { AdminOrder } from '@/lib/orders/adminOrders'

export function OrderCard({ order }: { order: AdminOrder }) {
  const actions = operatorActions(order.type, order.status)
  return (
    <article className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-center justify-between">
        <span className="font-extrabold text-beet">{orderNumber(order.public_token)}</span>
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          {order.type === 'pickup' ? 'Самовывоз' : 'Доставка'} · {STATUS_LABEL_RU[order.status]}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">{formatOrderTime(order.created_at)}</p>

      <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-beet/10 px-2.5 py-1.5 text-sm font-bold text-beet">
        <Icon name="clock" size={15} className="shrink-0" />
        {order.scheduled_for ? `Ко времени: ${formatScheduledFor(order.scheduled_for)}` : 'Как можно скорее'}
      </p>

      <ul className="mt-3 space-y-1 text-sm">
        {order.order_items.map((i, idx) => (
          <li key={idx} className="flex justify-between gap-3">
            <span><span className="text-beet">{i.qty}×</span> {i.name}
              {i.selected_options?.length > 0 && (
                <span className="text-muted"> · {i.selected_options.map((o) => o.optionName).join(', ')}</span>
              )}
            </span>
            <span className="whitespace-nowrap font-semibold">{formatZloty(i.line_total, 'pl')}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
        {/* contact */}
        <div className="flex items-center gap-1.5 font-semibold">
          <Icon name="phone" size={14} className="shrink-0 text-beet" />
          <span>{order.customer_name}</span>
          <span className="text-muted">·</span>
          <a href={`tel:${order.customer_phone.replace(/[^+\d]/g, '')}`} className="text-beet hover:underline">{order.customer_phone}</a>
        </div>

        {/* address (delivery) */}
        {order.type === 'delivery' && formatOrderAddress(order.address_snapshot) && (
          <div className="flex items-start gap-1.5 text-ink/80">
            <Icon name="pin" size={14} className="mt-0.5 shrink-0 text-beet" />
            <span>{formatOrderAddress(order.address_snapshot)}</span>
          </div>
        )}

        {/* notes */}
        {order.notes && (
          <div className="flex items-start gap-1.5 text-ink/70">
            <Icon name="receipt" size={14} className="mt-0.5 shrink-0 text-muted" />
            <span>{order.notes}</span>
          </div>
        )}

        {/* payment + total */}
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <span className="flex items-center gap-1.5 text-ink/80">
            <Icon name={order.payment_method === 'card' ? 'card' : 'wallet'} size={14} className="shrink-0 text-beet" />
            {order.payment_method === 'card'
              ? 'Картой'
              : order.cash_change_from ? `Наличные · сдача с ${formatZloty(order.cash_change_from, 'pl')}` : 'Наличные'}
          </span>
          <span className="whitespace-nowrap text-lg font-extrabold text-beet">{formatZloty(order.total, 'pl')}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {actions.map((a) => <StatusButton key={a.to} orderId={order.id} action={a} />)}
        <div className="ml-auto"><DeleteOrderButton orderId={order.id} small /></div>
      </div>
    </article>
  )
}
