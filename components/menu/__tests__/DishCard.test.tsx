import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, it, expect } from 'vitest'
import { DishCard } from '@/components/menu/DishCard'
import type { LocalizedDish } from '@/lib/menu/types'

const messages = { menu: { soldOut: 'Brak w sprzedaży', from: 'od' } }

function renderCard(dish: LocalizedDish) {
  return render(
    <NextIntlClientProvider locale="pl" messages={messages}>
      <DishCard dish={dish} locale="pl" />
    </NextIntlClientProvider>,
  )
}

const base: LocalizedDish = {
  id: 'd1', name: 'Barszcz', description: 'Z pampuszkami', basePrice: 2800,
  photoUrl: null, isAvailable: true, tags: [], optionGroups: [],
}

describe('DishCard', () => {
  it('shows name and formatted price', () => {
    renderCard(base)
    expect(screen.getByText('Barszcz')).toBeInTheDocument()
    expect(screen.getByText(/28,00/)).toBeInTheDocument()
  })

  it('marks stop-listed dishes as sold out and disables add', () => {
    renderCard({ ...base, isAvailable: false })
    expect(screen.getByText('Brak w sprzedaży')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled()
  })
})
