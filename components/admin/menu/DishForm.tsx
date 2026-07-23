'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { upsertDish } from '@/lib/menu/admin/actions'
import { parseZlotyToGrosze, formatGroszeToZlotyInput } from '@/lib/menu/admin/money'
import { useSaveRegistration, eqI18n, type SaveResult } from '@/components/admin/SaveBar'
import { I18nField } from './I18nField'
import { PhotoField } from './PhotoField'
import type { I18nText } from '@/lib/menu/admin/validate'
import type { AdminDishDetail } from '@/lib/menu/admin/queries'

const FIELD_ERRORS: Record<string, string> = {
  name: 'польское название обязательно',
  basePrice: 'некорректная цена',
  categoryId: 'выберите категорию',
  description: 'описание слишком длинное',
  photoUrl: 'слишком длинная ссылка',
  tags: 'некорректные теги',
  sort: 'порядок — целое число',
}

export function DishForm({
  categories, initial,
}: {
  categories: { id: string; namePl: string }[]
  initial: AdminDishDetail | null
}) {
  const router = useRouter()
  const [name, setName] = useState<I18nText>(initial?.name ?? {})
  const [description, setDescription] = useState<I18nText>(initial?.description ?? {})
  const [price, setPrice] = useState(initial ? formatGroszeToZlotyInput(initial.base_price) : '')
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? categories[0]?.id ?? '')
  const [soldOut, setSoldOut] = useState(initial ? !initial.is_available : false)
  const [hidden, setHidden] = useState(initial?.is_hidden ?? false)
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '')
  const [sort, setSort] = useState(String(initial?.sort ?? 0))
  const [photoUrl, setPhotoUrl] = useState(initial?.photo_url ?? '')

  const inputCls = 'w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-beet'
  const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-muted'

  // compare by meaning, not by exact characters, so reverting a value in any
  // equivalent form (26 / 26,00 / 26.00) turns the button gray again
  const normTags = (s: string) => s.split(',').map((t) => t.trim()).filter(Boolean).join('')
  const dirty =
    !eqI18n(name, initial?.name ?? {}) ||
    !eqI18n(description, initial?.description ?? {}) ||
    (initial ? parseZlotyToGrosze(price) !== initial.base_price : price.trim() !== '') ||
    categoryId !== (initial?.category_id ?? categories[0]?.id ?? '') ||
    soldOut !== (initial ? !initial.is_available : false) ||
    hidden !== (initial?.is_hidden ?? false) ||
    normTags(tags) !== normTags(initial?.tags.join(',') ?? '') ||
    (initial ? Number(sort) !== initial.sort : sort.trim() !== '0') ||
    photoUrl.trim() !== (initial?.photo_url ?? '')

  async function save(): Promise<SaveResult> {
    const grosze = parseZlotyToGrosze(price)
    if (grosze === null) return { ok: false, error: `Блюдо: ${FIELD_ERRORS.basePrice}` }
    const sortNum = Number(sort)
    if (!Number.isInteger(sortNum)) return { ok: false, error: `Блюдо: ${FIELD_ERRORS.sort}` }
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)
    const photo = photoUrl.trim()
    const res = await upsertDish({
      id: initial?.id,
      categoryId,
      name,
      description,
      basePrice: grosze,
      photoUrl: photo || null,
      isAvailable: !soldOut,
      isHidden: hidden,
      tags: tagList,
      sort: sortNum,
    })
    if (!res.ok) {
      const detail =
        res.error === 'photo_import_failed'
          ? 'не удалось скачать фото по ссылке — проверьте URL'
          : ('field' in res && res.field && FIELD_ERRORS[res.field]) || 'не удалось сохранить'
      return { ok: false, error: `Блюдо: ${detail}` }
    }
    if (!initial) {
      router.push(`/admin/menu/${res.id}`)
      return { ok: true }
    }
    // normalize local state so the dirty flag resets after refresh.
    // photoUrl comes back from the server (an external URL is auto-imported to
    // our storage there, so it differs from what was submitted).
    setPrice(formatGroszeToZlotyInput(grosze))
    setSort(String(sortNum))
    setTags(tagList.join(', '))
    setPhotoUrl(res.photoUrl ?? '')
    return { ok: true }
  }

  useSaveRegistration(initial ? `dish:${initial.id}` : 'dish:new', dirty, save)

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-panel/50 p-5">
      <I18nField label="Название" value={name} onChange={setName} />
      <I18nField label="Описание" value={description} onChange={setDescription} multiline />

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className={labelCls}>Цена, zł</span>
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="34,00" inputMode="decimal" className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>Категория</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.namePl}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>Теги (через запятую)</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="hit, spicy" className={inputCls} />
        </label>
        <label>
          <span className={labelCls}>Порядок</span>
          <input value={sort} onChange={(e) => setSort(e.target.value)} inputMode="numeric" className={inputCls} />
        </label>
      </div>

      <PhotoField value={photoUrl} onChange={setPhotoUrl} />

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={soldOut} onChange={(e) => setSoldOut(e.target.checked)} className="h-4 w-4 accent-beet" />
          Нет в наличии
        </label>
        <p className="pl-6 text-xs text-muted">Блюдо остаётся на сайте с пометкой «Нет в наличии», но заказать его нельзя.</p>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="h-4 w-4 accent-beet" />
          Убрать с сайта
        </label>
        <p className="pl-6 text-xs text-muted">Блюдо полностью скрыто — покупатель его не видит.</p>
      </div>
    </div>
  )
}
