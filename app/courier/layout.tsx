import { display, body as bodyFont } from '@/lib/fonts'

export const dynamic = 'force-dynamic'

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${display.variable} ${bodyFont.variable}`}>
      <body className="min-h-screen bg-paper text-ink">{children}</body>
    </html>
  )
}
