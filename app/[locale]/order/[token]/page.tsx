import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatZloty } from '@/lib/menu/price'
import { Icon } from '@/components/Icon'
import { SiteHeader } from '@/components/SiteHeader'
import type { Locale } from '@/i18n/config'

interface SelOpt { optionName: string }

export default async function OrderPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params
  const loc = locale as Locale
  setRequestLocale(loc)
  const t = await getTranslations('order')
  const tc = await getTranslations('checkout')

  const admin = createAdminClient()
  const { data: order } = await admin
    .from('orders')
    .select('*, order_items(name, unit_price, qty, selected_options, line_total)')
    .eq('public_token', token)
    .single()

  if (!order) notFound()

  const items = (order.order_items ?? []) as {
    name: string; unit_price: number; qty: number; selected_options: unknown; line_total: number
  }[]

  return (
    <>
      <SiteHeader locale={loc} />
      <main className="mx-auto max-w-2xl px-5 pb-16">
        <div className="mt-10 flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-herb/15 text-herb">
            <Icon name="gift" size={30} />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">{t('confirmedTitle')}</h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-ink/70">{t('confirmedSub')}</p>
          <p className="mt-4 rounded-full border border-line bg-panel px-4 py-1.5 text-sm font-semibold">
            {t('number')}: <span className="font-extrabold text-beet">#{token.slice(0, 8).toUpperCase()}</span>
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-line bg-panel p-6">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <span className="text-sm font-bold uppercase tracking-widest text-muted">
              {order.type === 'pickup' ? tc('pickup') : tc('delivery')}
            </span>
            <span className="rounded-full bg-mustard/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-mustard">
              {t('statusPending')}
            </span>
          </div>

          <ul className="divide-y divide-line">
            {items.map((i, idx) => {
              const opts = Array.isArray(i.selected_options) ? (i.selected_options as SelOpt[]) : []
              return (
                <li key={idx} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="font-bold">
                      <span className="text-beet">{i.qty}×</span> {i.name}
                    </p>
                    {opts.length > 0 && <p className="mt-0.5 text-xs text-muted">{opts.map((o) => o.optionName).join(', ')}</p>}
                  </div>
                  <span className="whitespace-nowrap font-semibold">{formatZloty(i.line_total, loc)}</span>
                </li>
              )
            })}
          </ul>

          <dl className="space-y-2 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{tc('subtotal')}</dt><dd className="font-semibold">{formatZloty(order.subtotal, loc)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{tc('deliveryLine')}</dt><dd className="font-semibold">{order.delivery_fee === 0 ? tc('free') : formatZloty(order.delivery_fee, loc)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 text-base">
              <dt className="font-bold">{tc('total')}</dt>
              <dd className="text-xl font-extrabold text-beet" style={{ fontFamily: 'var(--font-display)' }}>{formatZloty(order.total, loc)}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 rounded-3xl border border-line bg-panel p-6 text-sm">
          <div className="flex items-center gap-2 font-semibold">
            <Icon name="phone" size={16} className="text-beet" />{order.customer_name} · {order.customer_phone}
          </div>
          {order.type === 'delivery' && order.address_snapshot != null && (
            <p className="mt-2 flex items-start gap-2 text-ink/80">
              <Icon name="pin" size={16} className="mt-0.5 shrink-0 text-beet" />
              {(order.address_snapshot as { formatted?: string }).formatted || '—'}
            </p>
          )}
          <p className="mt-2 flex items-center gap-2 text-ink/80">
            <Icon name="wallet" size={16} className="text-beet" />{tc('paymentCash')}
          </p>
        </div>

        <Link href={`/${loc}/menu`} className="mt-8 flex items-center justify-center rounded-2xl border-2 border-ink/85 px-4 py-3 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper">
          {t('backToMenu')}
        </Link>
      </main>
    </>
  )
}
