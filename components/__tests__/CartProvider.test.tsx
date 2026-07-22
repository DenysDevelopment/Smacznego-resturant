import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { CartProvider, useCart } from '@/components/CartProvider'
import type { CartItem } from '@/lib/cart/types'

const dish: CartItem = { dishId: 'd1', name: 'Barszcz', unitPrice: 2800, qty: 1, selectedOptions: [] }

function Harness() {
  const cart = useCart()
  return (
    <div>
      <span data-testid="count">{cart.count}</span>
      <span data-testid="subtotal">{cart.subtotal}</span>
      <button onClick={() => cart.addItem(dish)}>add</button>
      <button onClick={() => cart.clear()}>clear</button>
    </div>
  )
}

describe('CartProvider', () => {
  beforeEach(() => localStorage.clear())

  it('adds items and stacks identical configs, exposes count + subtotal', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(<CartProvider><Harness /></CartProvider>)
    await user.click(screen.getByText('add'))
    await user.click(screen.getByText('add'))
    expect(screen.getByTestId('count').textContent).toBe('2')       // 2 units
    expect(screen.getByTestId('subtotal').textContent).toBe('5600') // 2 * 2800
  })

  it('persists to localStorage', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(<CartProvider><Harness /></CartProvider>)
    await user.click(screen.getByText('add'))
    expect(JSON.parse(localStorage.getItem('smacznego-cart')!)).toHaveLength(1)
  })
})
