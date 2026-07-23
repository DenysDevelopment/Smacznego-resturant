import { requireRole } from '@/lib/auth/require'
import { getSettings } from '@/lib/settings/getSettings'
import { SettingsForm } from '@/components/admin/settings/SettingsForm'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  await requireRole('staff')
  const settings = await getSettings()
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">Настройки</h1>
      <SettingsForm initial={settings} />
    </main>
  )
}
