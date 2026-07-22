'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/Icon'
import type { Role } from '@/lib/auth/passcode'

export function OrderStream({ role }: { role: Role }) {
  const router = useRouter()
  const [soundOn, setSoundOn] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)

  function beep() {
    const ctx = ctxRef.current
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.3)
  }

  function enableSound() {
    if (!ctxRef.current) ctxRef.current = new AudioContext()
    if (ctxRef.current.state === 'suspended') void ctxRef.current.resume()
    setSoundOn(true)
    beep()
  }

  useEffect(() => {
    const es = new EventSource('/api/admin/stream')
    let pollTimer: ReturnType<typeof setInterval> | null = null
    es.onmessage = (e) => {
      let msg: { type?: string; event?: string; status?: string; orderType?: string } = {}
      try { msg = JSON.parse(e.data) } catch { return }
      if (msg.type !== 'order') return
      router.refresh()
      const isNewForRole =
        (role === 'staff' && msg.event === 'INSERT' && msg.status === 'pending') ||
        (role === 'courier' && msg.status === 'ready' && msg.orderType === 'delivery')
      if (isNewForRole) beep()
    }
    es.onerror = () => { if (!pollTimer) pollTimer = setInterval(() => router.refresh(), 15_000) }
    return () => { es.close(); if (pollTimer) clearInterval(pollTimer) }
  }, [role, router])

  return (
    <button
      type="button"
      onClick={enableSound}
      className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-bold text-muted"
      title="Разрешить звук уведомлений"
    >
      <Icon name={soundOn ? 'check' : 'clock'} size={14} />
      {soundOn ? 'Звук включён' : 'Включить звук'}
    </button>
  )
}
