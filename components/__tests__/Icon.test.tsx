import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Icon } from '@/components/Icon'

describe('Icon', () => {
  it('renders an svg for a known name', () => {
    const { container } = render(<Icon name="cart" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('applies a custom size', () => {
    const { container } = render(<Icon name="plus" size={24} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '24')
  })
})
