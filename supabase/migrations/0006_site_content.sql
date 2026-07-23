-- Editable page-copy overrides. A missing key falls back to messages/*.json.
-- Publicly readable by design: holds only public site copy.
create table site_content (
  key text primary key,                       -- dot-path, e.g. 'home.about.body1'
  value jsonb not null default '{}'::jsonb,   -- {pl?, uk?, ru?}
  updated_at timestamptz not null default now()
);

alter table site_content enable row level security;
create policy "public read" on site_content for select using (true);
grant select on site_content to anon, authenticated;
grant all on site_content to service_role;
