# Smacznego — Фаза 4: Управление меню из админки. Дизайн-спека

**Дата:** 2026-07-17
**Статус:** Утверждён (черновик спеки, ждёт финальной вычитки)
**Опирается на:** `docs/superpowers/specs/2026-07-04-smacznego-delivery-design.md` (общая), `docs/superpowers/specs/2026-07-07-admin-courier-panel-design.md` (Ф3 — админка/гейт)
**Предыдущая фаза:** Ф3 (пульт кухни + курьер) — на ветке `feature/cart-checkout`, коммиты `d3cd681..0dbd9b3`.

---

## 1. Обзор и цель

Дать персоналу редактировать меню прямо из админки, без правки `seed.sql`/БД руками.
Сейчас блюда/опции задаются только сидом; менеджер не может поменять цену, добавить
блюдо или изменить набор опций. Ф4 добавляет раздел **`/admin/menu`** (под тем же
staff-гейтом Ф3) для **CRUD блюд** и управления их **опциями**.

### Зафиксированные решения (из брейншторма Ф4)

| Вопрос | Решение |
|---|---|
| Объём | Блюда (CRUD) + опции блюд (группы + опции). **Не** входят: CRUD категорий, загрузка фото, комбо, настройки ресторана |
| Категории | Только выбор из существующих (выпадашка при редактировании блюда); без создания/удаления категорий |
| Фото | `photo_url` — простое текстовое поле (путь вида `/dishes/xx.webp` или URL). Загрузка в Storage — вне scope |
| Языки контента | Все 3 (pl/uk/ru), **PL обязателен**, uk/ru опционально. Вкладки PL/UK/RU. `localize()` уже даёт фолбэк uk/ru → pl |
| Доступ | Роль `staff` (гейт Ф3). Записи через `createAdminClient` (service-role); каждый экшен заново проверяет сессию |
| Удаление блюда | Hard delete (имя снапшотится в `order_items`, история не рвётся; каскад убирает группы/опции) |
| Порядок | Числовое поле `sort` (без drag-and-drop) |

---

## 2. Затрагиваемая схема (существует, не меняется)

Из `0001_menu.sql` (все name/description — jsonb `{pl,uk,ru}`, цены в грошах):

- **categories**(id, name, sort, is_visible) — read-only для Ф4 (выпадашка).
- **dishes**(id, category_id→categories, name, description, base_price, photo_url, is_available, tags text[], sort).
- **option_groups**(id, dish_id→dishes, name, min_select, max_select, required, sort).
- **options**(id, option_group_id→option_groups, name, price_delta, sort).

RLS: публичное чтение; записи только через service-role (как `orders`). **Миграции не нужны** —
Ф4 использует существующие таблицы.

---

## 3. Данные и server actions

Новый слой `lib/menu/admin/` (server-only чтение + `'use server'` мутации), всё через
`createAdminClient()`; каждый мутирующий экшен вызывает `getSession()` и требует роль `staff`
(иначе `{ok:false, error:'unauthorized'}`). После успешной мутации — ревалидация публичного
меню: `revalidatePath('/[locale]/menu', 'page')` для всех локалей и `/[locale]` (hero главной).

Экшены (все возвращают `{ok:true, …} | {ok:false, error}`):

- `upsertDish(input)` — create (нет id) или update. Поля: `name{pl,uk,ru}`, `description{pl,uk,ru}`, `base_price` (грощи), `category_id`, `is_available`, `tags[]`, `sort`, `photo_url|null`.
- `deleteDish(id)` — hard delete (каскад по FK убирает группы/опции).
- `upsertOptionGroup(input)` — `dish_id`, `name{…}`, `min_select`, `max_select`, `required`, `sort`.
- `deleteOptionGroup(id)`.
- `upsertOption(input)` — `option_group_id`, `name{…}`, `price_delta` (грощи), `sort`.
- `deleteOption(id)`.

Чтение (server-only):
- `listCategoriesForSelect()` → `{id, name_pl, sort}[]` (для выпадашки, отсортировано по sort).
- `listDishesForAdmin()` → блюда сгруппированы по категориям, с флагами (стоп-лист, кол-во опций) для списка.
- `getDishForEdit(id)` → «сырое» блюдо + его группы + опции (jsonb как есть, для заполнения формы).

Чистые (юнит-тестируемые, без server-only) хелперы в `lib/menu/admin/`:
- `parseZlotyToGrosze(input: string): number` — `"34,00"`/`"34.5"`/`"34"` → `3400`/`3450`/`3400`; пусто/мусор/отрицательное → бросает/возвращает ошибку.
- `formatGroszeToZlotyInput(grosze): string` — для префилла поля (`3400` → `"34.00"`).
- `validateDishInput(input)` — PL-название непустое, `base_price ≥ 0`, `category_id` задан → `{ok} | {ok:false, field, error}`.
- `validateOptionGroupInput(input)` — `min_select ≥ 0`, `min_select ≤ max_select`, PL-название непустое.

---

## 4. UI — список блюд

**`/admin/menu`** (server component, `listDishesForAdmin()`):
- Заголовок + кнопка «+ Новое блюдо» (→ `/admin/menu/new`).
- Блюда, сгруппированные по категориям (заголовок категории = PL-название). Для каждого блюда: PL-название, цена (`formatZloty`), бейджи «Стоп-лист» (если `!is_available`) и «Опции: N», кнопки «Изменить» (→ `/admin/menu/[id]`) и «Удалить» (клиентская кнопка с `confirm` → `deleteDish`).
- Русский UI, без эмодзи (SVG `Icon`).

## 5. UI — форма блюда

**`/admin/menu/new`** и **`/admin/menu/[dishId]`** (для edit — префилл из `getDishForEdit`):
- Клиентская форма `DishForm`:
  - **Название** и **Описание** — под-компонент `I18nField` с вкладками PL/UK/RU (PL помечен обязательным).
  - **Цена** (текст, злотые, напр. `34,00`), **Категория** (`<select>` из `listCategoriesForSelect`), **Стоп-лист** (тумблер, инвертирует `is_available`), **Теги** (текст через запятую ↔ `string[]`), **Порядок** (`sort`, число), **Фото** (`photo_url`, текст + подсказка).
  - Сабмит → `upsertDish`; при ошибке валидации показываем поле+сообщение; успех → редирект на `/admin/menu` (или остаёмся на странице блюда, если это create → переходим на `/admin/menu/[newId]`, чтобы можно было добавить опции).

## 6. UI — редактор опций (на странице существующего блюда)

Показывается только для уже сохранённого блюда (нужен `dish_id`). Под формой блюда — секция «Опции»:
- Список групп (`OptionGroupEditor`): название (I18nField 3 языка), `min_select`/`max_select` (числа), `required` (тумблер), `sort`; «Сохранить группу» → `upsertOptionGroup`; «Удалить группу» (confirm) → `deleteOptionGroup`; «+ Группа опций».
- Внутри группы — список опций (`OptionRow`): название (I18nField), доп-цена (злотые→грощи, может быть 0/отрицательной), `sort`; «Сохранить»/«Удалить» → `upsertOption`/`deleteOption`; «+ Опция».
- Точечные upsert/delete по id (не переписываем весь набор группы разом).

## 7. Валидация и консистентность

- PL-название обязательно для блюда, группы, опции; uk/ru опционально (пустые не пишем — оставляем ключ отсутствующим, чтобы `localize` фолбэкнул на PL).
- `base_price ≥ 0`; `min_select ≥ 0` и `≤ max_select`; `price_delta` — любое целое (грощи).
- Ввод цен в злотых, хранение в грошах (`parseZlotyToGrosze`).
- Удаление блюда — hard delete; FK-каскад убирает его группы/опции. Каскад по `order_items.dish_id` = `set null`, имя позиции уже снапшотнуто — история заказов цела.
- После каждой мутации — `revalidatePath` меню (все локали) + главной.

## 8. Тесты (vitest, как в проекте)

- **Юнит:** `parseZlotyToGrosze` (кейсы `"34,00"`→3400, `"34.5"`→3450, `"0"`→0, `""`/`"abc"`/`"-1"`→ошибка), `formatGroszeToZlotyInput` (3400→`"34.00"`), `validateDishInput` (PL required, price≥0, category required), `validateOptionGroupInput` (min≤max, min≥0, PL required).
- **Экшены/UI:** проверяются прогоном приложения (создать блюдо → появилось в `/admin/menu` и в публичном `/pl/menu`; поменять цену → отразилась; добавить опцию → видна в OptionSheet при заказе; стоп-лист → блюдо «Brak w sprzedaży»; удалить блюдо → пропало).

## 9. Файлы / слои

**Новое:**
- `lib/menu/admin/money.ts` (parse/format зл↔грощи), `lib/menu/admin/validate.ts` (валидаторы) — чистые, тестируемые.
- `lib/menu/admin/queries.ts` (server-only: listDishesForAdmin, getDishForEdit, listCategoriesForSelect).
- `lib/menu/admin/actions.ts` (`'use server'`: upsertDish/deleteDish/upsertOptionGroup/…).
- `app/admin/menu/page.tsx` (список), `app/admin/menu/new/page.tsx`, `app/admin/menu/[dishId]/page.tsx`.
- `components/admin/menu/*`: `DishForm`, `I18nField`, `OptionGroupEditor`, `OptionRow`, `DeleteButton`, `MenuList`(admin).

**Переиспользуем:** `getSession` (Ф2 auth), `createAdminClient`, `formatZloty`, `localize`, `Icon`, палитра/шрифты, паттерн server-action+revalidate из Ф3.
**Изменяем:** возможно добавить ссылку «Меню» в шапку/навигацию админки (мелко).

## 10. Вне scope (YAGNI)

Загрузка фото (Supabase Storage), CRUD категорий, комбо/сеты, настройки ресторана
(мин. заказ/доставка/часы), история/аудит изменений, drag-and-drop сортировка,
массовые операции, черновики/публикация.
