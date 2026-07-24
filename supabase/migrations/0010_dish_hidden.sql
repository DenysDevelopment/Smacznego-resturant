-- A dish can now be in one of three states for the storefront:
--   is_available=true,  is_hidden=false → on sale (visible, orderable)
--   is_available=false, is_hidden=false → out of stock (visible, "нет в наличии", not orderable)
--   is_hidden=true                      → removed from the site (not shown to customers at all)
alter table dishes add column if not exists is_hidden boolean not null default false;
