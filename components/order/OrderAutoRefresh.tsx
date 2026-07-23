'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Keeps the order status live while `active`:
 *  - polls on an interval when the tab is visible;
 *  - refreshes immediately when the tab regains focus/visibility.
 * The visibility handling matters because browsers throttle or pause timers in
 * background tabs (and on phones with the screen off), so a plain interval
 * alone would look "stuck" until the user came back.
 */
export function OrderAutoRefresh({ active, intervalMs = 12000 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    if (!active) return
    let timer: ReturnType<typeof setInterval> | undefined

    const stop = () => {
      if (timer) clearInterval(timer)
      timer = undefined
    }
    const start = () => {
      stop()
      timer = setInterval(() => router.refresh(), intervalMs)
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        router.refresh() // catch up immediately on return
        start()
      } else {
        stop() // don't spin while hidden
      }
    }
    const onFocus = () => router.refresh()

    start()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
    }
  }, [active, intervalMs, router])

  return null
}
