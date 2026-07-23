import { Icon } from '@/components/Icon'
import { formatZloty } from '@/lib/menu/price'
import { STATUS_LABEL_RU, operatorActions } from '@/lib/orders/statusFlow'
import { orderNumber, formatOrderTime, formatScheduledFor } from '@/lib/orders/format'
import { StatusButton } from './StatusButton'
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

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-sm">
        <span className="flex items-center gap-1 font-semibold"><Icon name="phone" size={14} className="text-beet" />{order.customer_name} · {order.customer_phone}</span>
        {order.type === 'delivery' && order.address_snapshot?.formatted && (
          <span className="flex items-center gap-1 text-ink/80"><Icon name="pin" size={14} className="text-beet" />{order.address_snapshot.formatted}</span>
        )}
        <span className="flex items-center gap-1 text-ink/80"><Icon name="wallet" size={14} className="text-beet" />
          {order.cash_change_from ? `Сдача с ${formatZloty(order.cash_change_from, 'pl')}` : 'Наличные'}
        </span>
        <span className="ml-auto text-lg font-extrabold text-beet">{formatZloty(order.total, 'pl')}</span>
      </div>

      {order.notes && (
        <p className="mt-2 flex items-center gap-1 text-sm text-ink/70">
          <Icon name="receipt" size={14} className="text-muted" />{order.notes}
        </p>
      )}

      {actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((a) => <StatusButton key={a.to} orderId={order.id} action={a} />)}
        </div>
      )}
    </article>
  )
}
