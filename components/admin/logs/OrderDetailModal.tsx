'use client'
import { useEffect, useState } from 'react'
import { formatZloty } from '@/lib/menu/price'
import { STATUS_LABEL_RU, type OrderStatus } from '@/lib/orders/statusFlow'
import { getOrderDetail, type OrderDetail } from '@/lib/orders/orderDetail'

const dtFmt = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
})
const fmt = (iso: string | null) => (iso ? dtFmt.format(new Date(iso)) : '—')

// timeline steps we care about, in order
const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'pending', label: 'Оформлен' },
  { status: 'confirmed', label: 'Принят' },
  { status: 'preparing', label: 'Готовится' },
  { status: 'ready', label: 'Готов' },
  { status: 'out_for_delivery', label: 'Забрал курьер' },
  { status: 'delivered', label: 'Доставлен' },
  { status: 'picked_up', label: 'Выдан' },
  { status: 'cancelled', label: 'Отменён' },
  { status: 'rejected', label: 'Отклонён' },
]

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1 text-sm">
      <span className="w-32 shrink-0 text-muted">{label}</span>
      <span className="min-w-0 flex-1 font-medium text-ink">{children}</span>
    </div>
  )
}

export function OrderDetailModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    getOrderDetail(orderId).then((res) => {
      if (!alive) return
      if (res.ok) setOrder(res.order)
      else setError(res.error === 'unauthorized' ? 'Нет доступа' : 'Не удалось загрузить заказ')
    })
    return () => { alive = false }
  }, [orderId])

  // close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const a = order?.address
  const addrLines = a
    ? [a.formatted || [a.street, a.building].filter(Boolean).join(' '),
       a.apartment && `кв. ${a.apartment}`, a.floor && `этаж ${a.floor}`,
       a.entrance && `подъезд ${a.entrance}`, a.intercom && `домофон ${a.intercom}`].filter(Boolean)
    : []

  const eventAt = new Map<string, string>()
  for (const e of order?.events ?? []) if (!eventAt.has(e.status)) eventAt.set(e.status, e.created_at)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 sm:p-8" onClick={onClose}>
      <div
        className="my-auto w-full max-w-lg rounded-2xl border border-line bg-paper shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-lg font-extrabold tracking-tight">
            Заказ {order ? <span className="font-mono text-beet">#{order.public_token.slice(0, 8)}</span> : ''}
          </h2>
          <button type="button" onClick={onClose} aria-label="Закрыть" className="rounded-full p-1 text-muted hover:bg-ink hover:text-paper">
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {!order && !error && <p className="px-5 py-8 text-center text-sm text-muted">Загрузка…</p>}
        {error && <p className="px-5 py-8 text-center text-sm font-semibold text-brick">{error}</p>}

        {order && (
          <div className="max-h-[75vh] overflow-y-auto px-5 py-4">
            {/* status + type */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-panel px-3 py-1 text-xs font-bold">{order.type === 'delivery' ? 'Доставка' : 'Самовывоз'}</span>
              <span className="rounded-full bg-panel px-3 py-1 text-xs font-bold">{STATUS_LABEL_RU[order.status]}</span>
            </div>

            {/* items */}
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Состав</h3>
            <ul className="mb-4 space-y-1.5">
              {order.items.map((i, idx) => (
                <li key={idx} className="flex justify-between gap-3 text-sm">
                  <span><span className="font-bold text-beet">{i.qty}×</span> {i.name}
                    {i.selected_options?.length > 0 && (
                      <span className="text-muted"> · {i.selected_options.map((o) => o.optionName).join(', ')}</span>
                    )}
                  </span>
                  <span className="whitespace-nowrap font-semibold tabular-nums">{formatZloty(i.line_total, 'ru')}</span>
                </li>
              ))}
            </ul>

            {/* totals */}
            <dl className="mb-4 space-y-0.5 border-y border-line py-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Товары</dt><dd className="tabular-nums">{formatZloty(order.subtotal, 'ru')}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Доставка</dt><dd className="tabular-nums">{order.delivery_fee ? formatZloty(order.delivery_fee, 'ru') : 'Бесплатно'}</dd></div>
              <div className="flex justify-between text-base font-extrabold"><dt>Итого</dt><dd className="tabular-nums text-beet">{formatZloty(order.total, 'ru')}</dd></div>
            </dl>

            {/* customer / checkout data */}
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Клиент и оформление</h3>
            <div className="mb-4">
              <Row label="Имя">{order.customer_name}</Row>
              <Row label="Телефон"><a href={`tel:${order.customer_phone.replace(/[^+\d]/g, '')}`} className="text-beet hover:underline">{order.customer_phone}</a></Row>
              {order.type === 'delivery' && (
                <Row label="Адрес">{addrLines.length ? addrLines.join(', ') : '—'}</Row>
              )}
              <Row label="Когда">{order.scheduled_for ? fmt(order.scheduled_for) : 'Как можно скорее'}</Row>
              <Row label="Оплата">
                {order.payment_method === 'card'
                  ? 'Картой при получении'
                  : order.cash_change_from ? `Наличные, сдача с ${formatZloty(order.cash_change_from, 'ru')}` : 'Наличные при получении'}
              </Row>
              {order.notes && <Row label="Комментарий">{order.notes}</Row>}
            </div>

            {/* timeline */}
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Хронология</h3>
            <div>
              {STEPS.filter((s) => eventAt.has(s.status)).length === 0 ? (
                <p className="py-1 text-sm text-muted">Нет событий (заказ создан до журнала)</p>
              ) : (
                STEPS.filter((s) => eventAt.has(s.status)).map((s) => (
                  <Row key={s.status} label={s.label}>{fmt(eventAt.get(s.status) ?? null)}</Row>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
