-- The service-role client (lib/supabase/admin.ts createAdminClient) bypasses RLS,
-- but RLS bypass does NOT substitute for base table grants in Postgres. On hosted
-- Supabase this is pre-provisioned; on the local CLI stack, tables created by the
-- `postgres` migration role only granted service_role INSERT (missing SELECT/
-- UPDATE/DELETE), so admin-client reads (e.g. dishes lookups for order creation)
-- failed with "permission denied for table dishes". Grant full access explicitly,
-- matching the hosted-project convention.
grant select, insert, update, delete on all tables in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
