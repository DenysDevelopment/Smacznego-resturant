-- Audit log of order status changes: powers the /admin/logs history
-- (placed / accepted / delivered times) without ever mutating order rows.
create table order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now()
);
create index order_events_order_id_idx on order_events(order_id);
create index order_events_created_at_idx on order_events(created_at);

alter table order_events enable row level security;
-- private: written and read only via the service-role client (no anon policies)
grant select, insert, update, delete on order_events to service_role;
