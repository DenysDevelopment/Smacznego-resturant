import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Smacznego',
  description: 'Domowa kuchnia z dostawą',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
