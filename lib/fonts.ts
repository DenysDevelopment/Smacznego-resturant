import { Playfair_Display, Inter } from 'next/font/google'

// Playfair Display supports latin, latin-ext AND cyrillic — required for uk/ru
// headings. (Fraunces has no cyrillic subset and would fail the build.)
export const serif = Playfair_Display({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-serif',
  display: 'swap',
})

export const sans = Inter({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap',
})
