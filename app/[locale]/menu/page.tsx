import { setRequestLocale } from 'next-intl/server'
import { getMenu } from '@/lib/menu/getMenu'
import { CategoryNav } from '@/components/menu/CategoryNav'
import { MenuList } from '@/components/menu/MenuList'
import type { Locale } from '@/i18n/config'

export default async function MenuPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale as Locale)
  const categories = await getMenu(locale as Locale)
  return (
    <main className="mx-auto max-w-2xl px-4">
      <CategoryNav categories={categories} />
      <MenuList categories={categories} locale={locale as Locale} />
    </main>
  )
}
