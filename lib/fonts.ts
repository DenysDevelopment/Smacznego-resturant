import { Bitter, Manrope } from 'next/font/google'

// Canteen Poster type system.
// Display: Bitter — a warm, sturdy slab serif (menu-board / deli energy), with a
// real cyrillic subset for uk/ru. Body: Manrope — clean humanist sans, cyrillic too.
// (Deliberately NOT Playfair/Cormorant/Fraunces/Inter — those are the restaurant reflex.)
export const display = Bitter({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

export const body = Manrope({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-body',
  display: 'swap',
})
