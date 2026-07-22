'use client'
import Link from 'next/link'
import { useCart } from '@/components/CartProvider'
import { Icon } from '@/components/Icon'
import type { Locale } from '@/i18n/config'

export function CartBadge({ locale }: { locale: Locale }) {
  const { count, registerBadge } = useCart()
  return (
    <Link
      ref={registerBadge}
      href={`/${locale}/cart`}
      className="flex items-center gap-1.5 rounded-full bg-beet px-3.5 py-2 text-sm font-bold text-paper transition-transform hover:scale-105"
    >
      <Icon name="cart" size={15} />
      <span data-cart-count className="inline-block tabular-nums">{count}</span>
    </Link>
  )
}
