with cat as (
  insert into categories (name, sort) values
    ('{"pl":"Zupy","uk":"Супи","ru":"Супы"}', 1),
    ('{"pl":"Pierogi","uk":"Вареники","ru":"Вареники"}', 2)
  returning id, sort
)
insert into dishes (category_id, name, description, base_price, is_available, sort)
select
  (select id from cat where sort = 1),
  '{"pl":"Barszcz ukraiński","uk":"Борщ український","ru":"Борщ украинский"}'::jsonb,
  '{"pl":"Z pampuszkami","uk":"З пампушками","ru":"С пампушками"}'::jsonb,
  2800, true, 1
union all
select
  (select id from cat where sort = 2),
  '{"pl":"Pierogi z ziemniakami","uk":"Вареники з картоплею","ru":"Вареники с картошкой"}'::jsonb,
  '{"pl":"12 szt.","uk":"12 шт.","ru":"12 шт."}'::jsonb,
  2400, true, 1
union all
select
  (select id from cat where sort = 1),
  '{"pl":"Kotlet po kijowsku","uk":"Котлета по-київськи","ru":"Котлета по-киевски"}'::jsonb,
  '{}'::jsonb, 3200, false, 2;  -- stop-list example

-- Size options on the borscht
with d as (select id from dishes where name->>'pl' = 'Barszcz ukraiński' limit 1),
     g as (
       insert into option_groups (dish_id, name, min_select, max_select, required, sort)
       select id, '{"pl":"Rozmiar","uk":"Розмір","ru":"Размер"}', 1, 1, true, 1 from d
       returning id
     )
insert into options (option_group_id, name, price_delta, sort)
select id, '{"pl":"300 ml","uk":"300 мл","ru":"300 мл"}'::jsonb, 0, 1 from g
union all
select id, '{"pl":"500 ml","uk":"500 мл","ru":"500 мл"}'::jsonb, 700, 2 from g;
