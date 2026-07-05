import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, it, expect, vi } from 'vitest'
import { OptionSheet } from '@/components/menu/OptionSheet'
import { CartProvider, useCart } from '@/components/CartProvider'
import type { LocalizedDish } from '@/lib/menu/types'

const messages = { cart: { add: 'Dodaj', choose: 'Wybierz', qty: 'Ilość', total: 'Razem', required: 'wymagane' } }

const dish: LocalizedDish = {
  id: 'd1', name: 'Barszcz', description: '', basePrice: 2800, photoUrl: null, isAvailable: true, tags: [],
  optionGroups: [
    { id: 'g1', name: 'Rozmiar', minSelect: 1, maxSelect: 1, required: true, options: [
      { id: 'o1', name: '300 ml', priceDelta: 0 }, { id: 'o2', name: '500 ml', priceDelta: 700 },
    ] },
  ],
}

function Probe() {
  const { subtotal, count } = useCart()
  return <div><span data-testid="c">{count}</span><span data-testid="s">{subtotal}</span></div>
}

describe('OptionSheet', () => {
  it('requires a required group and adds a configured item at the right price', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    localStorage.clear()
    render(
      <NextIntlClientProvider locale="pl" messages={messages}>
        <CartProvider>
          <OptionSheet dish={dish} locale="pl" onClose={vi.fn()} />
          <Probe />
        </CartProvider>
      </NextIntlClientProvider>,
    )
    // Add disabled until the required group is chosen
    const addBtn = screen.getByRole('button', { name: /Dodaj/ })
    expect(addBtn).toBeDisabled()
    await user.click(screen.getByLabelText(/500 ml/))
    expect(addBtn).toBeEnabled()
    await user.click(addBtn)
    expect(screen.getByTestId('c').textContent).toBe('1')
    expect(screen.getByTestId('s').textContent).toBe('3500') // 2800 + 700
  })
})
