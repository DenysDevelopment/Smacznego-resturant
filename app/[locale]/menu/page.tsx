import { setRequestLocale, getTranslations } from 'next-intl/server'
import { getMenu } from '@/lib/menu/getMenu'
import { CategoryNav } from '@/components/menu/CategoryNav'
import { MenuList } from '@/components/menu/MenuList'
import { SiteHeader } from '@/components/SiteHeader'
import type { Locale } from '@/i18n/config'

export default async function MenuPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const loc = locale as Locale
  setRequestLocale(loc)
  const t = await getTranslations('nav')
  const categories = await getMenu(loc)
  return (
    <>
      <SiteHeader locale={loc} />
      <div className="mx-auto max-w-6xl px-5 pt-8">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{t('menu')}</h1>
      </div>
      <div className="sticky top-[57px] z-20 border-b border-line bg-paper/85 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-5">
          <CategoryNav categories={categories} />
        </div>
      </div>
      <MenuList categories={categories} locale={loc} />
    </>
  )
}
