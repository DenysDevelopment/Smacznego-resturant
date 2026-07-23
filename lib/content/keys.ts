// Whitelist of page-copy keys editable from the admin. Drives both the
// editor UI and saveContent validation. site_content is publicly readable —
// never add keys holding non-public strings.

export type ContentSection = 'hero' | 'about' | 'delivery' | 'contact' | 'footer' | 'order'

export interface ContentKey {
  /** dot-path into the next-intl messages tree */
  key: string
  /** Russian label shown in the admin */
  label: string
  multiline: boolean
  section: ContentSection
}

export const CONTENT_KEYS: ContentKey[] = [
  { key: 'home.status', label: 'Статус (бейдж сверху)', multiline: false, section: 'hero' },
  { key: 'home.title', label: 'Заголовок', multiline: false, section: 'hero' },
  { key: 'home.titleAccent', label: 'Заголовок — акцентная строка', multiline: false, section: 'hero' },
  { key: 'home.subcopy', label: 'Подзаголовок', multiline: true, section: 'hero' },
  { key: 'home.cta', label: 'Кнопка заказа', multiline: false, section: 'hero' },
  { key: 'home.heroAlt', label: 'Alt-текст фото', multiline: false, section: 'hero' },

  { key: 'home.about.title', label: 'Заголовок', multiline: false, section: 'about' },
  { key: 'home.about.body1', label: 'Абзац 1', multiline: true, section: 'about' },
  { key: 'home.about.body2', label: 'Абзац 2', multiline: true, section: 'about' },
  { key: 'home.about.tag1', label: 'Тег 1', multiline: false, section: 'about' },
  { key: 'home.about.tag2', label: 'Тег 2', multiline: false, section: 'about' },

  { key: 'home.delivery.title', label: 'Заголовок', multiline: false, section: 'delivery' },
  { key: 'home.delivery.subcopy', label: 'Описание', multiline: true, section: 'delivery' },
  { key: 'home.delivery.feeNote', label: 'Примечание к стоимости', multiline: false, section: 'delivery' },
  { key: 'home.delivery.timeValue', label: 'Время доставки', multiline: false, section: 'delivery' },
  { key: 'home.delivery.payNote', label: 'Примечание об оплате', multiline: false, section: 'delivery' },

  { key: 'home.contact.title', label: 'Заголовок', multiline: false, section: 'contact' },

  { key: 'footer.tagline', label: 'Слоган', multiline: true, section: 'footer' },
  { key: 'footer.values', label: 'Ценности (строка)', multiline: false, section: 'footer' },
  { key: 'footer.payNote', label: 'Примечание об оплате', multiline: false, section: 'footer' },

  // order tracking page
  { key: 'order.confirmedTitle', label: 'Заголовок «Заказ принят»', multiline: false, section: 'order' },
  { key: 'order.confirmedSub', label: 'Подзаголовок', multiline: true, section: 'order' },
  { key: 'order.progressTitle', label: 'Заголовок блока статуса', multiline: false, section: 'order' },
  { key: 'order.liveNote', label: 'Пометка автообновления', multiline: false, section: 'order' },
  { key: 'order.status.pending', label: 'Статус: ожидает', multiline: false, section: 'order' },
  { key: 'order.status.confirmed', label: 'Статус: подтверждён', multiline: false, section: 'order' },
  { key: 'order.status.preparing', label: 'Статус: готовится', multiline: false, section: 'order' },
  { key: 'order.status.ready', label: 'Статус: готов', multiline: false, section: 'order' },
  { key: 'order.status.out_for_delivery', label: 'Статус: курьер в пути', multiline: false, section: 'order' },
  { key: 'order.status.delivered', label: 'Статус: доставлен', multiline: false, section: 'order' },
  { key: 'order.status.picked_up', label: 'Статус: выдан', multiline: false, section: 'order' },
  { key: 'order.status.cancelled', label: 'Статус: отменён', multiline: false, section: 'order' },
  { key: 'order.status.rejected', label: 'Статус: отклонён', multiline: false, section: 'order' },
]

export const SECTION_LABELS: Record<ContentSection, string> = {
  hero: 'Главный экран',
  about: 'О нас',
  delivery: 'Доставка',
  contact: 'Контакты',
  footer: 'Подвал',
  order: 'Приём заказа',
}

export const CONTENT_KEY_SET = new Set(CONTENT_KEYS.map((k) => k.key))
