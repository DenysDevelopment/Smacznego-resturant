'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrderStatus } from '@/lib/orders/updateStatus'
import type { StatusAction } from '@/lib/orders/statusFlow'

const TONE: Record<StatusAction['tone'], string> = {
  primary: 'bg-beet text-paper',
  danger: 'border border-beet text-beet',
  neutral: 'border border-line text-ink',
}

export function StatusButton({ orderId, action }: { orderId: string; action: StatusAction }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <button
      type="button" disabled={pending}
      onClick={() => start(async () => { await updateOrderStatus(orderId, action.to); router.refresh() })}
      className={`rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50 ${TONE[action.tone]}`}
    >
      {action.label}
    </button>
  )
}
