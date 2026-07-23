// Pure validators for admin menu forms/actions.
import type { Locale } from '@/i18n/config'

export type I18nText = Partial<Record<Locale, string>>

export interface DishInput {
  id?: string
  categoryId: string
  name: I18nText
  description: I18nText
  basePrice: number // grosze
  photoUrl: string | null
  isAvailable: boolean // false = "нет в наличии" (visible with badge, not orderable)
  isHidden: boolean    // true = "убрать с сайта" (not shown to customers at all)
  tags: string[]
  sort: number
}

export interface OptionGroupInput {
  id?: string
  dishId: string
  name: I18nText
  minSelect: number
  maxSelect: number
  required: boolean
  sort: number
}

export interface OptionInput {
  id?: string
  optionGroupId: string
  name: I18nText
  priceDelta: number // grosze, may be negative
  sort: number
}

export type FieldError = { ok: false; field: string; error: string }
export type Valid = { ok: true }

/** Drop empty locales so `localize()` falls back to PL for missing keys. */
export function cleanI18n(value: I18nText): I18nText {
  const out: I18nText = {}
  for (const key of ['pl', 'uk', 'ru'] as const) {
    const s = value[key]?.trim()
    if (s) out[key] = s
  }
  return out
}

const MAX_TEXT = 500

function checkI18nName(name: I18nText): FieldError | null {
  if (!name.pl?.trim()) return { ok: false, field: 'name', error: 'pl_required' }
  for (const key of ['pl', 'uk', 'ru'] as const) {
    if ((name[key]?.length ?? 0) > MAX_TEXT) return { ok: false, field: 'name', error: 'too_long' }
  }
  return null
}

export function validateDishInput(input: DishInput): Valid | FieldError {
  const nameErr = checkI18nName(input.name)
  if (nameErr) return nameErr
  for (const key of ['pl', 'uk', 'ru'] as const) {
    if ((input.description[key]?.length ?? 0) > 2000) return { ok: false, field: 'description', error: 'too_long' }
  }
  if (!Number.isInteger(input.basePrice) || input.basePrice < 0) {
    return { ok: false, field: 'basePrice', error: 'bad_price' }
  }
  if (!input.categoryId) return { ok: false, field: 'categoryId', error: 'category_required' }
  if (!Number.isInteger(input.sort)) return { ok: false, field: 'sort', error: 'bad_sort' }
  if (input.photoUrl !== null && input.photoUrl.length > 500) {
    return { ok: false, field: 'photoUrl', error: 'too_long' }
  }
  if (!Array.isArray(input.tags) || input.tags.length > 20 || input.tags.some((t) => t.length > 40)) {
    return { ok: false, field: 'tags', error: 'bad_tags' }
  }
  return { ok: true }
}

export function validateOptionGroupInput(input: OptionGroupInput): Valid | FieldError {
  const nameErr = checkI18nName(input.name)
  if (nameErr) return nameErr
  if (!input.dishId) return { ok: false, field: 'dishId', error: 'dish_required' }
  if (!Number.isInteger(input.minSelect) || input.minSelect < 0) {
    return { ok: false, field: 'minSelect', error: 'bad_min' }
  }
  if (!Number.isInteger(input.maxSelect) || input.maxSelect < input.minSelect) {
    return { ok: false, field: 'maxSelect', error: 'min_gt_max' }
  }
  if (!Number.isInteger(input.sort)) return { ok: false, field: 'sort', error: 'bad_sort' }
  return { ok: true }
}

export function validateOptionInput(input: OptionInput): Valid | FieldError {
  const nameErr = checkI18nName(input.name)
  if (nameErr) return nameErr
  if (!input.optionGroupId) return { ok: false, field: 'optionGroupId', error: 'group_required' }
  if (!Number.isInteger(input.priceDelta)) return { ok: false, field: 'priceDelta', error: 'bad_delta' }
  if (!Number.isInteger(input.sort)) return { ok: false, field: 'sort', error: 'bad_sort' }
  return { ok: true }
}
