create table restaurant_settings (
  id boolean primary key default true,
  name text not null,
  phone text not null,
  address_text text not null,
  lat double precision not null,
  lng double precision not null,
  delivery_radius_m int not null,
  delivery_fee int not null,               -- grosze
  free_delivery_threshold int not null,    -- grosze
  min_order int not null,                  -- grosze
  hours jsonb not null,                    -- {mon:{open,close}|null, ...}
  prep_lead_minutes int not null,
  constraint singleton check (id)
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  street text, building text, apartment text, floor text, entrance text, intercom text,
  lat double precision, lng double precision, formatted text,
  label text,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  public_token text not null unique,
  customer_id uuid references customers(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  type text not null check (type in ('delivery','pickup')),
  status text not null default 'pending'
    check (status in ('pending','confirmed','preparing','ready','out_for_delivery','delivered','picked_up','cancelled','rejected')),
  payment_method text not null default 'cash' check (payment_method = 'cash'),
  cash_change_from int,
  subtotal int not null,
  delivery_fee int not null default 0,
  discount int not null default 0,
  total int not null,
  notes text,
  address_snapshot jsonb,
  scheduled_for timestamptz,
  language text not null default 'pl',
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  dish_id uuid references dishes(id) on delete set null,
  name text not null,
  unit_price int not null,                 -- grosze
  qty int not null check (qty > 0),
  selected_options jsonb not null default '[]',
  line_total int not null
);

create index on order_items(order_id);
create index on orders(created_at);

-- restaurant_settings: public read (client needs fee/threshold/hours). No public write.
alter table restaurant_settings enable row level security;
create policy "public read" on restaurant_settings for select using (true);
grant select on restaurant_settings to anon, authenticated;

-- Order/customer tables: RLS on, NO policies. Only the service-role client (which
-- bypasses RLS) touches them. No grants to anon/authenticated => fully private.
alter table customers enable row level security;
alter table addresses enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
