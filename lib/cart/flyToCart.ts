// Fly-to-cart micro-interaction (Web Animations API, no dependencies).
// The dish image arcs from the menu card into the cart badge, which then
// gives a springy "bam" and pops its counter. Respects reduced-motion.

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Springy scale bounce on the badge + a punchy pop on its number. */
export function pulseBadge(badge: HTMLElement): void {
  badge.animate(
    [
      { transform: 'scale(1)' },
      { transform: 'scale(1.32)', offset: 0.3 },
      { transform: 'scale(0.9)', offset: 0.55 },
      { transform: 'scale(1.08)', offset: 0.78 },
      { transform: 'scale(1)' },
    ],
    { duration: 480, easing: 'cubic-bezier(.25,.8,.3,1)' },
  )
  const num = badge.querySelector<HTMLElement>('[data-cart-count]')
  num?.animate(
    [
      { transform: 'scale(1)', color: 'var(--color-paper)' },
      { transform: 'scale(1.9)', color: 'var(--color-mustard)', offset: 0.35 },
      { transform: 'scale(1)', color: 'var(--color-paper)' },
    ],
    { duration: 520, easing: 'cubic-bezier(.25,.8,.3,1)' },
  )
}

/**
 * Clone `source` and animate it along an arc into `badge`, then pulse the badge.
 * `imageUrl` renders the flying token as that image; without it, a beet disc flies.
 */
export function flyToCart(source: HTMLElement, imageUrl: string | null, badge: HTMLElement): void {
  if (prefersReducedMotion()) { pulseBadge(badge); return }

  const from = source.getBoundingClientRect()
  const to = badge.getBoundingClientRect()
  if (from.width === 0 || to.width === 0) { pulseBadge(badge); return }

  const size = Math.max(48, Math.min(from.width, 150))

  const fly = document.createElement('div')
  fly.style.cssText =
    `position:fixed;left:0;top:0;width:${size}px;height:${size}px;` +
    'z-index:60;pointer-events:none;border-radius:9999px;will-change:transform,opacity;'
  if (imageUrl) {
    const img = document.createElement('img')
    img.src = imageUrl
    img.alt = ''
    img.style.cssText =
      'width:100%;height:100%;object-fit:contain;' +
      'filter:drop-shadow(0 12px 16px rgba(36,28,21,.35));'
    fly.appendChild(img)
  } else {
    fly.style.background = 'var(--color-beet)'
    fly.style.boxShadow = '0 10px 20px -8px rgba(164,18,63,.7)'
  }
  document.body.appendChild(fly)

  const startX = from.left + from.width / 2 - size / 2
  const startY = from.top + from.height / 2 - size / 2
  const endX = to.left + to.width / 2 - size / 2
  const endY = to.top + to.height / 2 - size / 2
  const dx = endX - startX
  const dy = endY - startY

  const anim = fly.animate(
    [
      { transform: `translate(${startX}px, ${startY}px) scale(1) rotate(0deg)`, opacity: 1, offset: 0 },
      { transform: `translate(${startX + dx * 0.5}px, ${startY + dy * 0.5 - 70}px) scale(0.7) rotate(-14deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${endX}px, ${endY}px) scale(0.12) rotate(-26deg)`, opacity: 0.4, offset: 1 },
    ],
    { duration: 620, easing: 'cubic-bezier(.5,.05,.7,.2)' },
  )

  let pulsed = false
  const finish = () => {
    if (pulsed) return
    pulsed = true
    fly.remove()
    pulseBadge(badge)
  }
  anim.onfinish = finish
  // Safety net if onfinish never fires (e.g. tab backgrounded).
  anim.oncancel = finish
}
