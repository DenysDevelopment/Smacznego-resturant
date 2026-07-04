import { createClient } from '@/lib/supabase/server'
import { toLocalizedCategories } from './transform'
import type { LocalizedCategory, MenuRow } from './types'
import type { Locale } from '@/i18n/config'

export async function getMenu(locale: Locale): Promise<LocalizedCategory[]> {
  const supabase = await createClient()
  const [categories, dishes, groups, options] = await Promise.all([
    supabase.from('categories').select('id, name, sort, is_visible'),
    supabase.from('dishes').select('id, category_id, name, description, base_price, photo_url, is_available, tags, sort'),
    supabase.from('option_groups').select('id, dish_id, name, min_select, max_select, required, sort'),
    supabase.from('options').select('id, option_group_id, name, price_delta, sort'),
  ])

  const firstError = categories.error ?? dishes.error ?? groups.error ?? options.error
  if (firstError) {
    throw new Error(`getMenu failed to load menu: ${firstError.message}`)
  }

  const rows: MenuRow = {
    categories: (categories.data ?? []) as MenuRow['categories'],
    dishes: (dishes.data ?? []) as MenuRow['dishes'],
    option_groups: (groups.data ?? []) as MenuRow['option_groups'],
    options: (options.data ?? []) as MenuRow['options'],
  }
  return toLocalizedCategories(rows, locale)
}
