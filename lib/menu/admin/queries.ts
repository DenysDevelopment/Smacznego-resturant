import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/require'
import type { I18nText } from './validate'

export interface AdminDishListItem {
  id: string
  namePl: string
  basePrice: number
  isAvailable: boolean
  isHidden: boolean
  optionGroupCount: number
  sort: number
  photoUrl: string | null
}
export interface AdminCategoryGroup {
  id: string
  namePl: string
  dishes: AdminDishListItem[]
}

export async function listCategoriesForSelect(): Promise<{ id: string; namePl: string }[]> {
  await requireRole('staff')
  const admin = createAdminClient()
  const { data, error } = await admin.from('categories').select('id, name, sort').order('sort')
  if (error) throw new Error(`listCategoriesForSelect: ${error.message}`)
  return (data ?? []).map((c) => ({ id: c.id, namePl: (c.name as I18nText).pl ?? '' }))
}

export async function listDishesForAdmin(): Promise<AdminCategoryGroup[]> {
  await requireRole('staff')
  const admin = createAdminClient()
  const [cats, dishes, groups] = await Promise.all([
    admin.from('categories').select('id, name, sort').order('sort'),
    admin.from('dishes').select('id, category_id, name, base_price, is_available, is_hidden, sort, photo_url').order('sort'),
    admin.from('option_groups').select('id, dish_id'),
  ])
  if (cats.error) throw new Error(`listDishesForAdmin(cats): ${cats.error.message}`)
  if (dishes.error) throw new Error(`listDishesForAdmin(dishes): ${dishes.error.message}`)
  if (groups.error) throw new Error(`listDishesForAdmin(groups): ${groups.error.message}`)

  const groupCount = new Map<string, number>()
  for (const g of groups.data ?? []) {
    groupCount.set(g.dish_id, (groupCount.get(g.dish_id) ?? 0) + 1)
  }

  return (cats.data ?? []).map((c) => ({
    id: c.id,
    namePl: (c.name as I18nText).pl ?? '',
    dishes: (dishes.data ?? [])
      .filter((d) => d.category_id === c.id)
      .map((d) => ({
        id: d.id,
        namePl: (d.name as I18nText).pl ?? '',
        basePrice: d.base_price,
        isAvailable: d.is_available,
        isHidden: d.is_hidden,
        optionGroupCount: groupCount.get(d.id) ?? 0,
        sort: d.sort,
        photoUrl: d.photo_url,
      })),
  }))
}

export interface AdminOptionRaw { id: string; name: I18nText; price_delta: number; sort: number }
export interface AdminOptionGroupRaw {
  id: string; name: I18nText; min_select: number; max_select: number; required: boolean; sort: number
  options: AdminOptionRaw[]
}
export interface AdminDishDetail {
  id: string
  category_id: string
  name: I18nText
  description: I18nText
  base_price: number
  photo_url: string | null
  is_available: boolean
  is_hidden: boolean
  tags: string[]
  sort: number
  option_groups: AdminOptionGroupRaw[]
}

export async function getDishForEdit(id: string): Promise<AdminDishDetail | null> {
  await requireRole('staff')
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('dishes')
    .select('id, category_id, name, description, base_price, photo_url, is_available, is_hidden, tags, sort, option_groups(id, name, min_select, max_select, required, sort, options(id, name, price_delta, sort))')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`getDishForEdit: ${error.message}`)
  if (!data) return null
  const detail = data as unknown as AdminDishDetail
  detail.option_groups.sort((a, b) => a.sort - b.sort)
  for (const g of detail.option_groups) g.options.sort((a, b) => a.sort - b.sort)
  return detail
}
