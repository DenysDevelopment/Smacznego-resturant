-- Public-read Storage bucket for dish photos. Writes go through the
-- service-role client only (RLS bypass), so no insert/update policies.
insert into storage.buckets (id, name, public)
values ('dishes', 'dishes', true)
on conflict (id) do nothing;

create policy "public read dish photos"
  on storage.objects for select
  using (bucket_id = 'dishes');
