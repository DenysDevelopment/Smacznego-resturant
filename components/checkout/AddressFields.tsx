'use client'
import { useTranslations } from 'next-intl'
import { type AddressValue, formatAddress } from '@/lib/address/types'

const FIELDS: (keyof AddressValue)[] = ['street', 'building', 'apartment', 'floor', 'entrance', 'intercom']

export function AddressFields({ value, onChange }: { value: AddressValue; onChange: (v: AddressValue) => void }) {
  const t = useTranslations('checkout')
  function set(field: keyof AddressValue, v: string) {
    const next = { ...value, [field]: v }
    next.formatted = formatAddress(next)
    onChange(next)
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {FIELDS.map((f) => (
        <label key={f} className={`text-xs font-semibold uppercase tracking-wide text-muted ${f === 'street' ? 'col-span-2' : ''}`}>
          {t(f)}
          <input value={value[f] as string} onChange={(e) => set(f, e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm font-medium text-ink outline-none transition-colors focus:border-beet" />
        </label>
      ))}
    </div>
  )
}
