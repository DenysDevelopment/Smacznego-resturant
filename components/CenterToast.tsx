'use client'
import { useEffect, useState } from 'react'
import { Icon } from '@/components/Icon'

type Tone = 'error' | 'info'
interface ToastMsg { id: number; text: string; tone: Tone }

let listener: ((t: ToastMsg) => void) | null = null
let counter = 0

/** Show a small toast centered on the screen (auto-dismisses). */
export function showCenterToast(text: string, tone: Tone = 'error'): void {
  counter += 1
  listener?.({ id: counter, text, tone })
}

/** Mount once (e.g. in a layout). Renders the current center toast, if any. */
export function CenterToast() {
  const [toast, setToast] = useState<ToastMsg | null>(null)

  useEffect(() => {
    listener = (t) => setToast(t)
    return () => { listener = null }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  if (!toast) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        role="status"
        aria-live="polite"
        onClick={() => setToast(null)}
        className="pointer-events-auto flex max-w-xs cursor-pointer items-center gap-2.5 rounded-2xl bg-ink px-5 py-3.5 text-center text-sm font-semibold text-paper shadow-[0_20px_50px_-12px_rgba(36,28,21,.65)] animate-[centerToastIn_.18s_ease-out]"
      >
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${toast.tone === 'error' ? 'bg-brick/25 text-brick' : 'bg-herb/25 text-herb'}`}>
          <Icon name={toast.tone === 'error' ? 'close' : 'check'} size={16} />
        </span>
        <span className="text-left leading-snug">{toast.text}</span>
      </div>
      <style>{`@keyframes centerToastIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )
}
