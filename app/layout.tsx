import type { Metadata } from 'next'
import { serif, sans } from '@/lib/fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'Smacznego',
  description: 'Domowa kuchnia z dostawą',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
