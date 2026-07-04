'use client'
import { usePathname, useRouter } from 'next/navigation'
import { LOCALES, type Locale } from '@/i18n/config'
import { Icon } from '@/components/Icon'

export function LanguageSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname()
  const router = useRouter()

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value
    const segments = pathname.split('/')
    segments[1] = next // replace leading locale segment
    router.replace(segments.join('/'))
  }

  return (
    <label className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-muted">
      <Icon name="globe" size={13} />
      <select value={current} onChange={onChange} className="bg-transparent uppercase outline-none">
        {LOCALES.map((l) => (
          <option key={l} value={l} className="text-black">
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}
