import { getAnySession } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Both staff and courier sessions may subscribe by design: the courier
  // screen uses this stream too, and the payload carries no PII (only
  // eventType/status/orderType).
  const session = await getAnySession()
  if (!session) return new Response('unauthorized', { status: 401 })

  const admin = createAdminClient()
  const encoder = new TextEncoder()
  let heartbeat: ReturnType<typeof setInterval>
  let channel: ReturnType<typeof admin.channel>

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      send({ type: 'ready' })
      // SSE comment heartbeat keeps proxies from closing an idle connection.
      heartbeat = setInterval(() => controller.enqueue(encoder.encode(': ping\n\n')), 25_000)

      channel = admin
        .channel('orders-stream')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
          const row = (payload.new ?? payload.old) as { status?: string; type?: string }
          send({ type: 'order', event: payload.eventType, status: row?.status, orderType: row?.type })
        })
        .subscribe()
    },
    // Runs when the client disconnects — tear down the heartbeat + Realtime channel.
    cancel() {
      clearInterval(heartbeat)
      admin.removeChannel(channel)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
