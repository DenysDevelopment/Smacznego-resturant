'use client'
import { useState } from 'react'
import { formatZloty } from '@/lib/menu/price'
import { STATUS_LABEL_RU } from '@/lib/orders/statusFlow'
import { OrderDetailModal } from './OrderDetailModal'
import type { OrderLogRow } from '@/lib/orders/adminOrders'

const dateFmt = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
})
const timeFmt = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit', hour12: false,
})

function fmtDate(iso: string) { return dateFmt.format(new Date(iso)) }
function fmtTime(iso: string | null) { return iso ? timeFmt.format(new Date(iso)) : '—' }

const SUCCESS = new Set(['delivered', 'picked_up'])
const FAIL = new Set(['cancelled', 'rejected'])

function StatusBadge({ status }: { status: OrderLogRow['status'] }) {
  const tone = SUCCESS.has(status)
    ? 'bg-herb/15 text-herb'
    : FAIL.has(status)
      ? 'bg-brick/15 text-brick'
      : 'bg-mustard/15 text-mustard'
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>{STATUS_LABEL_RU[status]}</span>
}

export function OrderLogTable({ rows }: { rows: OrderLogRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (rows.length === 0) {
    return <p className="rounded-2xl border border-line bg-panel px-4 py-6 text-center text-sm text-muted">Нет заказов за выбранный период</p>
  }
  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[52rem] border-collapse text-sm">
          <thead>
            <tr className="bg-panel text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-3 py-2.5">№</th>
              <th className="px-3 py-2.5">Тип</th>
              <th className="px-3 py-2.5">Оформлен</th>
              <th className="px-3 py-2.5">Принят</th>
              <th className="px-3 py-2.5">Доставлен</th>
              <th className="px-3 py-2.5">Статус</th>
              <th className="px-3 py-2.5">Клиент</th>
              <th className="px-3 py-2.5 text-right">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => setOpenId(r.id)}
                title="Открыть подробности"
                className="cursor-pointer border-t border-line align-top transition-colors hover:bg-beet/5"
              >
                <td className="px-3 py-2.5 font-mono text-xs font-bold text-beet">#{r.public_token.slice(0, 8)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{r.type === 'delivery' ? 'Доставка' : 'Самовывоз'}</td>
                <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{fmtDate(r.created_at)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-ink/70">{fmtTime(r.accepted_at)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-ink/70">{fmtTime(r.finished_at)}</td>
                <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-2.5">
                  <div className="font-semibold">{r.customer_name}</div>
                  <div className="text-xs text-muted">{r.customer_phone}</div>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-right font-semibold tabular-nums">{formatZloty(r.total, 'ru')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openId && <OrderDetailModal orderId={openId} onClose={() => setOpenId(null)} />}
    </>
  )
}
