-- On/off toggles for optional storefront elements (order-tracking steps and
-- texts). Absent key = enabled by default; a row with enabled=false hides it.
create table site_flags (
  key text primary key,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table site_flags enable row level security;
create policy "public read" on site_flags for select using (true);
grant select on site_flags to anon, authenticated;
grant all on site_flags to service_role;
