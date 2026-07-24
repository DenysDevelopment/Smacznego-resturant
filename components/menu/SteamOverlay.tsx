'use client'
import { useEffect, useRef, useState } from 'react'

// Looping decorative animation — pause it while the card is off-screen
// so long menus don't burn compositor time on invisible wisps.
export function SteamOverlay() {
  const ref = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setPaused(!entry.isIntersecting), { rootMargin: '96px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      data-steam
      aria-hidden
      className={`steam pointer-events-none absolute inset-x-0 top-[22%] h-[36%] ${paused ? 'steam-paused' : ''}`}
    >
      <i />
      <i />
      <i />
    </div>
  )
}
