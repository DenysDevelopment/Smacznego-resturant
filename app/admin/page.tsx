import { listActiveOrders } from '@/lib/orders/adminOrders'
import { OrderBoard } from '@/components/admin/OrderBoard'
import { OrderStream } from '@/components/admin/OrderStream'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const orders = await listActiveOrders()
  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Пульт кухни</h1>
        <OrderStream role="staff" />
      </div>
      <OrderBoard orders={orders} />
    </main>
  )
}
