import { requireRole } from '@/lib/auth/require'
import { listOrderLog } from '@/lib/orders/adminOrders'
import { warsawTodayYmd, warsawYmdStartUtc, nextYmd } from '@/lib/time/warsaw'
import { LogFilter } from '@/components/admin/logs/LogFilter'
import { OrderLogTable } from '@/components/admin/logs/OrderLogTable'

export const dynamic = 'force-dynamic'

const YMD = /^\d{4}-\d{2}-\d{2}$/

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  await requireRole('staff')
  const sp = await searchParams
  const from = sp.from && YMD.test(sp.from) ? sp.from : undefined
  const to = sp.to && YMD.test(sp.to) ? sp.to : undefined

  const rows = await listOrderLog({
    from: from ? warsawYmdStartUtc(from).toISOString() : undefined,
    // inclusive end day → exclusive start of the next day
    to: to ? warsawYmdStartUtc(nextYmd(to)).toISOString() : undefined,
  })

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">История заказов</h1>
        <span className="text-sm text-muted">Показано: {rows.length}{rows.length === 500 ? ' (макс.)' : ''}</span>
      </div>
      <LogFilter maxDate={warsawTodayYmd(new Date())} />
      <OrderLogTable rows={rows} />
    </main>
  )
}
