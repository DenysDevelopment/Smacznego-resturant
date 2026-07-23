import { display, body as bodyFont } from '@/lib/fonts'
import { getSession } from '@/lib/auth/session'
import { AdminNav } from '@/components/admin/AdminNav'
import { AdminSaveProvider } from '@/components/admin/SaveBar'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The layout also wraps /admin/login, so it must not redirect itself —
  // pages call requireRole('staff'); here the session only toggles the nav.
  const session = await getSession('staff')
  return (
    <html lang="ru" className={`${display.variable} ${bodyFont.variable}`}>
      <body className="min-h-screen bg-paper text-ink pb-24">
        <AdminSaveProvider>
          {session?.role === 'staff' && <AdminNav />}
          {children}
        </AdminSaveProvider>
      </body>
    </html>
  )
}
