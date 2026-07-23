import { describe, it, expect } from 'vitest'
import { mergeMessages } from '@/lib/content/merge'

const BASE = {
  home: {
    title: 'Domowa kuchnia,',
    about: { title: 'Gotujemy jak w domu', body1: 'Tekst.' },
  },
  footer: { tagline: 'Mała kuchnia.' },
}

describe('mergeMessages', () => {
  it('overrides a leaf when the locale value is non-empty', () => {
    const out = mergeMessages(BASE, { 'home.title': { pl: 'Nowy tytuł' } }, 'pl')
    expect((out as typeof BASE).home.title).toBe('Nowy tytuł')
    // deep path
    const out2 = mergeMessages(BASE, { 'home.about.body1': { pl: 'Inny tekst' } }, 'pl')
    expect((out2 as typeof BASE).home.about.body1).toBe('Inny tekst')
  })

  it('falls back to JSON when the locale value is empty or missing', () => {
    const out = mergeMessages(BASE, { 'home.title': { pl: 'Nowy', uk: '' } }, 'uk')
    expect((out as typeof BASE).home.title).toBe('Domowa kuchnia,')
  })

  it('ignores unknown paths and non-string leaves', () => {
    const out = mergeMessages(BASE, {
      'home.missing.deep': { pl: 'x' },
      'home.about': { pl: 'not-a-leaf' },
      nope: { pl: 'y' },
    }, 'pl')
    expect(out).toEqual(BASE)
  })

  it('does not mutate the input tree', () => {
    const before = structuredClone(BASE)
    mergeMessages(BASE, { 'home.title': { pl: 'Zmiana' } }, 'pl')
    expect(BASE).toEqual(before)
  })

  it('trims override values', () => {
    const out = mergeMessages(BASE, { 'footer.tagline': { ru: '  Текст  ' } }, 'ru')
    expect((out as typeof BASE).footer.tagline).toBe('Текст')
  })
})
