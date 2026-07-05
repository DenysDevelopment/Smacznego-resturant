import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, it, expect, vi } from 'vitest'
import { AddressFields } from '@/components/checkout/AddressFields'
import { emptyAddress, formatAddress } from '@/lib/address/types'

const messages = { checkout: { street: 'Ulica', building: 'Nr', apartment: 'Mieszkanie', floor: 'Piętro', entrance: 'Klatka', intercom: 'Domofon' } }

describe('AddressFields', () => {
  it('emits updated value with a formatted string on edit', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <NextIntlClientProvider locale="pl" messages={messages}>
        <AddressFields value={emptyAddress()} onChange={onChange} />
      </NextIntlClientProvider>,
    )
    await user.type(screen.getByLabelText('Ulica'), 'Przykładowa')
    expect(onChange).toHaveBeenCalled()
    const last = onChange.mock.calls.at(-1)![0]
    expect(last.street).toContain('Przykładowa'.slice(-1)) // last keystroke applied
  })

  it('formatAddress joins street + building + apartment', () => {
    expect(formatAddress({ ...emptyAddress(), street: 'Przykładowa', building: '1', apartment: '5' }))
      .toBe('Przykładowa 1/5')
  })
})
