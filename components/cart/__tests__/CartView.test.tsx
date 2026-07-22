import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, it, expect, beforeEach } from 'vitest'
import { CartView } from '@/components/cart/CartView'
import { CartProvider, useCart } from '@/components/CartProvider'
import { SettingsProvider } from '@/components/SettingsProvider'
import type { Settings } from '@/lib/settings/types'
import type { CartItem } from '@/lib/cart/types'

const messages = { cart: { title: 'Koszyk', empty: 'Pusto', toMenu: 'Do menu', subtotal: 'Suma', deliveryLine: 'Dostawa', free: 'Za darmo', total: 'Razem', addForFree: '{amount} do darmowej dostawy', toFree: 'do darmowej dostawy', checkout: 'Zamów', minOrder: 'Min. zamówienie', remove: 'Usuń' } }
const settings = { deliveryFee: 800, freeDeliveryThreshold: 6000, minOrder: 3000 } as Settings
const item: CartItem = { dishId: 'd1', name: 'Barszcz', unitPrice: 2800, qty: 1, selectedOptions: [] }

function Seed() { const { addItem } = useCart(); return <button onClick={() => addItem(item)}>seed</button> }

function wrap(ui: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="pl" messages={messages}>
      <SettingsProvider value={settings}><CartProvider>{ui}</CartProvider></SettingsProvider>
    </NextIntlClientProvider>
  )
}

describe('CartView', () => {
  beforeEach(() => localStorage.clear())

  it('blocks checkout below min order and enables it once met', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(wrap(<><Seed /><CartView locale="pl" /></>))
    await user.click(screen.getByText('seed')) // subtotal 2800 < 3000
    expect(screen.getByRole('link', { name: /Zamów/ })).toHaveAttribute('aria-disabled', 'true')
    await user.click(screen.getByText('seed')) // subtotal 5600 >= 3000
    expect(screen.getByRole('link', { name: /Zamów/ })).toHaveAttribute('aria-disabled', 'false')
  })
})
