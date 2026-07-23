'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasRole } from '@/lib/auth/require'
import { LOCALES } from '@/i18n/config'
import {
  cleanI18n, validateDishInput, validateOptionGroupInput, validateOptionInput,
  type DishInput, type OptionGroupInput, type OptionInput,
} from './validate'
import { importImageFromUrl } from './upload'
import type { Json } from '@/lib/supabase/types'

type Fail = { ok: false; error: string; field?: string }
const unauthorized: Fail = { ok: false, error: 'unauthorized' }

/** http(s) link to a host other than our own storage bucket. */
function isExternalImageUrl(v: string): boolean {
  return /^https?:\/\//i.test(v) && !v.includes('/storage/v1/object/public/')
}

function revalidateMenu(): void {
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}/menu`, 'page')
    revalidatePath(`/${locale}`, 'page')
  }
}

export async function upsertDish(input: DishInput): Promise<{ ok: true; id: string; photoUrl: string | null } | Fail> {
  if (!(await hasRole('staff'))) return unauthorized
  const valid = validateDishInput(input)
  if (!valid.ok) return valid

  // Never persist a third-party image URL: pull it into our own storage so the
  // storefront (optimized <Image> + strict prod CSP) can actually load it.
  let photo = input.photoUrl?.trim() || null
  if (photo && isExternalImageUrl(photo)) {
    const imported = await importImageFromUrl(photo)
    if (!imported.ok) return { ok: false, error: 'photo_import_failed', field: 'photoUrl' }
    photo = imported.url
  }

  const admin = createAdminClient()
  const row = {
    category_id: input.categoryId,
    name: cleanI18n(input.name) as unknown as Json,
    description: cleanI18n(input.description) as unknown as Json,
    base_price: input.basePrice,
    photo_url: photo,
    is_available: input.isAvailable,
    is_hidden: input.isHidden,
    tags: input.tags.map((t) => t.trim()).filter(Boolean),
    sort: input.sort,
  }
  const query = input.id
    ? admin.from('dishes').update(row).eq('id', input.id).select('id').single()
    : admin.from('dishes').insert(row).select('id').single()
  const { data, error } = await query
  if (error || !data) return { ok: false, error: 'db_error' }
  revalidateMenu()
  return { ok: true, id: data.id, photoUrl: photo }
}

export async function deleteDish(id: string): Promise<{ ok: true } | Fail> {
  if (!(await hasRole('staff'))) return unauthorized
  const admin = createAdminClient()
  // hard delete: FK cascade removes option groups/options;
  // order_items.dish_id is ON DELETE SET NULL with the name snapshotted
  const { error } = await admin.from('dishes').delete().eq('id', id)
  if (error) return { ok: false, error: 'db_error' }
  revalidateMenu()
  return { ok: true }
}

export async function upsertOptionGroup(input: OptionGroupInput): Promise<{ ok: true; id: string } | Fail> {
  if (!(await hasRole('staff'))) return unauthorized
  const valid = validateOptionGroupInput(input)
  if (!valid.ok) return valid
  const admin = createAdminClient()
  const row = {
    dish_id: input.dishId,
    name: cleanI18n(input.name) as unknown as Json,
    min_select: input.minSelect,
    max_select: input.maxSelect,
    required: input.required,
    sort: input.sort,
  }
  const query = input.id
    ? admin.from('option_groups').update(row).eq('id', input.id).select('id').single()
    : admin.from('option_groups').insert(row).select('id').single()
  const { data, error } = await query
  if (error || !data) return { ok: false, error: 'db_error' }
  revalidateMenu()
  return { ok: true, id: data.id }
}

export async function deleteOptionGroup(id: string): Promise<{ ok: true } | Fail> {
  if (!(await hasRole('staff'))) return unauthorized
  const admin = createAdminClient()
  const { error } = await admin.from('option_groups').delete().eq('id', id)
  if (error) return { ok: false, error: 'db_error' }
  revalidateMenu()
  return { ok: true }
}

export async function upsertOption(input: OptionInput): Promise<{ ok: true; id: string } | Fail> {
  if (!(await hasRole('staff'))) return unauthorized
  const valid = validateOptionInput(input)
  if (!valid.ok) return valid
  const admin = createAdminClient()
  const row = {
    option_group_id: input.optionGroupId,
    name: cleanI18n(input.name) as unknown as Json,
    price_delta: input.priceDelta,
    sort: input.sort,
  }
  const query = input.id
    ? admin.from('options').update(row).eq('id', input.id).select('id').single()
    : admin.from('options').insert(row).select('id').single()
  const { data, error } = await query
  if (error || !data) return { ok: false, error: 'db_error' }
  revalidateMenu()
  return { ok: true, id: data.id }
}

export async function deleteOption(id: string): Promise<{ ok: true } | Fail> {
  if (!(await hasRole('staff'))) return unauthorized
  const admin = createAdminClient()
  const { error } = await admin.from('options').delete().eq('id', id)
  if (error) return { ok: false, error: 'db_error' }
  revalidateMenu()
  return { ok: true }
}
