'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Icon } from '@/components/Icon'
import { useCart } from '@/components/CartProvider'
import { formatZloty } from '@/lib/menu/price'
import { getRecentOrders } from '@/lib/orders/recentOrders'
import { getOrdersSummary, type OrderSummary } from '@/lib/orders/publicSummary'
import type { Locale } from '@/i18n/config'
import type { OrderStatus } from '@/lib/orders/statusFlow'

const TERMINAL: OrderStatus[] = ['delivered', 'picked_up', 'cancelled', 'rejected']
const SUCCESS = new Set<OrderStatus>(['delivered', 'picked_up'])
const FAIL = new Set<OrderStatus>(['cancelled', 'rejected'])

const dateFmt = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
})

export function OrdersMenu({ locale }: { locale: Locale }) {
  const t = useTranslations('order.menu')
  const ts = useTranslations('order.status')
  const router = useRouter()
  const { addItem } = useCart()
  const [open, setOpen] = useState(false)
  const [orders, setOrders] = useState<OrderSummary[] | null>(null)

  const refresh = useCallback(async () => {
    const tokens = getRecentOrders()
    if (tokens.length === 0) { setOrders([]); return }
    setOrders(await getOrdersSummary(tokens))
  }, [])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => { if (open) refresh() }, [open, refresh])

  // keep active-order status fresh while the menu shows one
  const hasActive = (orders ?? []).some((o) => !TERMINAL.includes(o.status))
  useEffect(() => {
    if (!hasActive) return
    const id = setInterval(refresh, 20_000)
    return () => clearInterval(id)
  }, [hasActive, refresh])

  // hide entirely until we know there is at least one order
  if (!orders || orders.length === 0) return null

  const active = orders.filter((o) => !TERMINAL.includes(o.status))
  const past = orders.filter((o) => TERMINAL.includes(o.status)).slice(0, 5)

  function statusTone(s: OrderStatus) {
    return SUCCESS.has(s) ? 'bg-herb/15 text-herb' : FAIL.has(s) ? 'bg-brick/15 text-brick' : 'bg-mustard/15 text-mustard'
  }

  function reorder(o: OrderSummary) {
    for (const i of o.items) {
      if (!i.dishId) continue
      addItem({ dishId: i.dishId, name: i.name, unitPrice: i.unitPrice, qty: i.qty, selectedOptions: i.selectedOptions })
    }
    setOpen(false)
    router.push(`/${locale}/cart`)
  }

  function OrderRow({ o, showTrack }: { o: OrderSummary; showTrack: boolean }) {
    const canRepeat = o.items.some((i) => i.dishId)
    return (
      <div className="rounded-xl border border-line bg-panel p-3">
        <div className="flex items-center justify-between gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusTone(o.status)}`}>{ts(o.status as 'pending')}</span>
          <span className="text-xs text-muted">{dateFmt.format(new Date(o.createdAt))}</span>
        </div>
        <p className="mt-1.5 truncate text-sm text-ink/80">
          {o.items.map((i) => `${i.qty}× ${i.name}`).join(', ') || '—'}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-sm font-extrabold text-beet">{formatZloty(o.total, locale)}</span>
          <div className="flex items-center gap-1.5">
            {showTrack ? (
              <Link href={`/${locale}/order/${o.token}`} onClick={() => setOpen(false)} className="rounded-full bg-beet px-3 py-1.5 text-xs font-bold text-paper">
                {t('track')}
              </Link>
            ) : (
              <>
                <Link href={`/${locale}/order/${o.token}`} onClick={() => setOpen(false)} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-ink hover:text-paper">
                  {t('open')}
                </Link>
                <button
                  type="button"
                  disabled={!canRepeat}
                  onClick={() => reorder(o)}
                  title={canRepeat ? t('repeat') : t('repeatUnavailable')}
                  className="rounded-full bg-beet px-3 py-1.5 text-xs font-bold text-paper disabled:opacity-40"
                >
                  {t('repeat')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={t('title')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`relative inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-beet/40 text-xs font-bold text-beet transition-colors hover:bg-beet hover:text-paper ${
          open ? 'bg-beet text-paper' : 'bg-beet/10 sm:bg-beet/5'
        } w-10 sm:w-auto sm:px-3`}
      >
        <Icon name="receipt" size={18} />
        {hasActive && <span className="absolute right-1 top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-beet ring-2 ring-paper sm:right-1.5" />}
        <span className="hidden sm:inline">{t('title')}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 max-h-[70vh] w-80 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-2xl border border-line bg-paper p-3 shadow-2xl">
            {active.length > 0 && (
              <section className="mb-3">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{t('current')}</h3>
                <div className="space-y-2">
                  {active.map((o) => <OrderRow key={o.token} o={o} showTrack />)}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{t('history')}</h3>
                <div className="space-y-2">
                  {past.map((o) => <OrderRow key={o.token} o={o} showTrack={false} />)}
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  )
}
