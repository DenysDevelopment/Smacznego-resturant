'use client'
import Link from 'next/link'
import { useCart } from '@/components/CartProvider'
import { Icon } from '@/components/Icon'
import type { Locale } from '@/i18n/config'

export function CartBadge({ locale }: { locale: Locale }) {
  const { count } = useCart()
  return (
    <Link href={`/${locale}/cart`} className="flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 font-bold text-espresso">
      <Icon name="cart" size={15} />{count}
    </Link>
  )
}
