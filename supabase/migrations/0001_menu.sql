create extension if not exists "pgcrypto";

create table categories (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,           -- {"pl":"…","uk":"…","ru":"…"}
  sort int not null default 0,
  is_visible boolean not null default true
);

create table dishes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  base_price int not null,        -- grosze
  photo_url text,
  is_available boolean not null default true,  -- stop-list
  tags text[] not null default '{}',
  sort int not null default 0
);

create table option_groups (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references dishes(id) on delete cascade,
  name jsonb not null,
  min_select int not null default 0,
  max_select int not null default 1,
  required boolean not null default false,
  sort int not null default 0
);

create table options (
  id uuid primary key default gen_random_uuid(),
  option_group_id uuid not null references option_groups(id) on delete cascade,
  name jsonb not null,
  price_delta int not null default 0,  -- grosze
  sort int not null default 0
);

create table combos (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  price int not null,             -- grosze
  photo_url text,
  is_available boolean not null default true,
  sort int not null default 0
);

create table combo_items (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references combos(id) on delete cascade,
  dish_id uuid references dishes(id) on delete set null,
  qty int not null default 1
);

-- Public read-only access to the menu.
alter table categories enable row level security;
alter table dishes enable row level security;
alter table option_groups enable row level security;
alter table options enable row level security;
alter table combos enable row level security;
alter table combo_items enable row level security;

create policy "public read" on categories for select using (true);
create policy "public read" on dishes for select using (true);
create policy "public read" on option_groups for select using (true);
create policy "public read" on options for select using (true);
create policy "public read" on combos for select using (true);
create policy "public read" on combo_items for select using (true);

-- Public read requires table-level SELECT grants in addition to the RLS policies above.
grant select on categories, dishes, option_groups, options, combos, combo_items to anon, authenticated;
