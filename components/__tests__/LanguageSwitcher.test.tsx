import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

const replace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/pl/menu',
}))

import { LanguageSwitcher } from '@/components/LanguageSwitcher'

describe('LanguageSwitcher', () => {
  it('swaps the locale segment on change', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    render(<LanguageSwitcher current="pl" />)
    await user.selectOptions(screen.getByRole('combobox'), 'ru')
    expect(replace).toHaveBeenCalledWith('/ru/menu')
  })
})
