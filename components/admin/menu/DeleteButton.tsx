'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteDish, deleteOptionGroup, deleteOption } from '@/lib/menu/admin/actions'

const ACTIONS = { dish: deleteDish, group: deleteOptionGroup, option: deleteOption } as const

export function DeleteButton({
  kind, id, confirmText, redirectTo, small = false,
}: {
  kind: keyof typeof ACTIONS
  id: string
  confirmText: string
  /** navigate here after a successful delete (else just refresh) */
  redirectTo?: string
  small?: boolean
}) {
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmText)) return
        start(async () => {
          const res = await ACTIONS[kind](id)
          if (!res.ok) {
            window.alert('Не удалось удалить')
            return
          }
          if (redirectTo) router.push(redirectTo)
          else router.refresh()
        })
      }}
      className={`rounded-full border border-line font-semibold text-brick hover:bg-brick hover:text-paper disabled:opacity-50 ${
        small ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'
      }`}
    >
      {pending ? '…' : 'Удалить'}
    </button>
  )
}
