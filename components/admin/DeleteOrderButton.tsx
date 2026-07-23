'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/Icon'
import { deleteOrder } from '@/lib/orders/deleteOrder'

/**
 * Two-step delete: first click arms ("Точно удалить?"), second click deletes.
 * Blurring cancels the armed state, so a stray click can't erase an order.
 */
export function DeleteOrderButton({
  orderId, onDeleted, full = false, small = false,
}: {
  orderId: string
  /** called after a successful delete, before the router refresh (e.g. close a modal) */
  onDeleted?: () => void
  full?: boolean
  small?: boolean
}) {
  const [pending, start] = useTransition()
  const [armed, setArmed] = useState(false)
  const router = useRouter()

  function onClick() {
    if (!armed) { setArmed(true); return }
    start(async () => {
      const res = await deleteOrder(orderId)
      if (res.ok) { onDeleted?.(); router.refresh() }
      else { setArmed(false); window.alert('Не удалось удалить заказ') }
    })
  }

  const size = small ? 'px-3 py-1 text-xs' : full ? 'w-full justify-center px-4 py-2.5 text-sm' : 'px-4 py-2 text-sm'
  const look = armed ? 'bg-brick text-paper' : 'border border-brick/40 text-brick hover:bg-brick hover:text-paper'

  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      onBlur={() => setArmed(false)}
      title="Удалить заказ безвозвратно"
      className={`inline-flex items-center gap-1.5 rounded-full font-bold transition-colors disabled:opacity-50 ${size} ${look}`}
    >
      <Icon name="trash" size={small ? 13 : 15} />
      {pending ? 'Удаляем…' : armed ? 'Точно удалить?' : 'Удалить'}
    </button>
  )
}
