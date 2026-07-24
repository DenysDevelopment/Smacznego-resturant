-- Allow paying by card on the spot (courier terminal on delivery, or at the
-- counter on pickup) in addition to cash. Payment is still collected on
-- handover — no online/gateway payment.
alter table orders drop constraint if exists orders_payment_method_check;
alter table orders
  add constraint orders_payment_method_check
  check (payment_method in ('cash','card'));
