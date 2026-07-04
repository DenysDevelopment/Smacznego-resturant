import type { Locale } from '@/i18n/config'

type I18n = Partial<Record<Locale, string>>

export interface MenuRow {
  categories: { id: string; name: I18n; sort: number; is_visible: boolean }[]
  dishes: {
    id: string; category_id: string; name: I18n; description: I18n
    base_price: number; photo_url: string | null; is_available: boolean
    tags: string[]; sort: number
  }[]
  option_groups: { id: string; dish_id: string; name: I18n; min_select: number; max_select: number; required: boolean; sort: number }[]
  options: { id: string; option_group_id: string; name: I18n; price_delta: number; sort: number }[]
}

export interface LocalizedOption { id: string; name: string; priceDelta: number }
export interface LocalizedOptionGroup { id: string; name: string; minSelect: number; maxSelect: number; required: boolean; options: LocalizedOption[] }
export interface LocalizedDish { id: string; name: string; description: string; basePrice: number; photoUrl: string | null; isAvailable: boolean; tags: string[]; optionGroups: LocalizedOptionGroup[] }
export interface LocalizedCategory { id: string; name: string; dishes: LocalizedDish[] }
