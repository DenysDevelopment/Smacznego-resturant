-- ===== Menu (real dishes, real photos in /public/dishes) =====
insert into categories (name, sort) values
  ('{"pl":"Wareniki i pierogi","uk":"Вареники","ru":"Вареники"}'::jsonb, 1),
  ('{"pl":"Pielmieni","uk":"Пельмені","ru":"Пельмени"}'::jsonb, 2),
  ('{"pl":"Kotlety i mięso","uk":"Котлети та м''ясо","ru":"Котлеты и мясо"}'::jsonb, 3),
  ('{"pl":"Naleśniki","uk":"Налисники","ru":"Блины"}'::jsonb, 4),
  ('{"pl":"Ryby","uk":"Риба","ru":"Рыба"}'::jsonb, 5),
  ('{"pl":"Dania domowe","uk":"Домашні страви","ru":"Домашние блюда"}'::jsonb, 6);

insert into dishes (category_id, name, description, base_price, photo_url, is_available, sort)

-- ----- 1. Wareniki i pierogi -----
select (select id from categories where sort = 1),
  '{"pl":"Pierogi ruskie","uk":"Вареники по-руськи","ru":"Вареники по-русски"}'::jsonb,
  '{"pl":"Z ziemniakami i twarogiem, podsmażane","uk":"З картоплею та сиром, підсмажені","ru":"С картофелем и творогом, обжаренные"}'::jsonb,
  2600, '/dishes/dish-14.webp', true, 1
union all select (select id from categories where sort = 1),
  '{"pl":"Wareniki z ziemniakami","uk":"Вареники з картоплею","ru":"Вареники с картошкой"}'::jsonb,
  '{"pl":"12 szt., ze skwarkami","uk":"12 шт., зі шкварками","ru":"12 шт., со шкварками"}'::jsonb,
  2400, '/dishes/dish-04.webp', true, 2
union all select (select id from categories where sort = 1),
  '{"pl":"Pierogi z kapustą i grzybami","uk":"Вареники з капустою та грибами","ru":"Вареники с капустой и грибами"}'::jsonb,
  '{"pl":"Smażone, z podsmażoną cebulką","uk":"Смажені, з підсмаженою цибулькою","ru":"Жареные, с обжаренным луком"}'::jsonb,
  2600, '/dishes/dish-15.webp', true, 3
union all select (select id from categories where sort = 1),
  '{"pl":"Pierogi z mięsem","uk":"Вареники з м''ясом","ru":"Вареники с мясом"}'::jsonb,
  '{"pl":"Z wołowiną i podsmażaną cebulką","uk":"З яловичиною та підсмаженою цибулькою","ru":"С говядиной и обжаренным луком"}'::jsonb,
  2800, '/dishes/dish-20.webp', true, 4
union all select (select id from categories where sort = 1),
  '{"pl":"Pierogi z jagodami","uk":"Вареники з ягодами","ru":"Вареники с ягодами"}'::jsonb,
  '{"pl":"Na słodko, z jagodami","uk":"Солодкі, з ягодами","ru":"Сладкие, с ягодами"}'::jsonb,
  2200, '/dishes/dish-24.webp', true, 5

-- ----- 2. Pielmieni -----
union all select (select id from categories where sort = 2),
  '{"pl":"Pielmieni ze śmietaną","uk":"Пельмені зі сметаною","ru":"Пельмени со сметаной"}'::jsonb,
  '{"pl":"Domowe, z wołowiną","uk":"Домашні, з яловичиною","ru":"Домашние, с говядиной"}'::jsonb,
  2800, '/dishes/dish-22.webp', true, 1
union all select (select id from categories where sort = 2),
  '{"pl":"Pielmieni syberyjskie","uk":"Пельмені сибірські","ru":"Пельмени сибирские"}'::jsonb,
  '{"pl":"Wieprzowina i wołowina, z koperkiem","uk":"Свинина та яловичина, з кропом","ru":"Свинина и говядина, с укропом"}'::jsonb,
  3000, '/dishes/dish-01.webp', true, 2
union all select (select id from categories where sort = 2),
  '{"pl":"Pielmieni z kurczakiem","uk":"Пельмені з куркою","ru":"Пельмени с курицей"}'::jsonb,
  '{"pl":"Delikatne, z sosem śmietanowym","uk":"Ніжні, зі сметанним соусом","ru":"Нежные, со сметанным соусом"}'::jsonb,
  2600, '/dishes/dish-08.webp', true, 3
union all select (select id from categories where sort = 2),
  '{"pl":"Pielmieni po domowemu","uk":"Пельмені по-домашньому","ru":"Пельмени по-домашнему"}'::jsonb,
  '{"pl":"Duża porcja, ze śmietaną","uk":"Велика порція, зі сметаною","ru":"Большая порция, со сметаной"}'::jsonb,
  2800, '/dishes/dish-11.webp', true, 4
union all select (select id from categories where sort = 2),
  '{"pl":"Pielmieni z łososiem","uk":"Пельмені з лососем","ru":"Пельмени с лососем"}'::jsonb,
  '{"pl":"Z łososiem i koperkiem","uk":"З лососем та кропом","ru":"С лососем и укропом"}'::jsonb,
  3400, '/dishes/dish-16.webp', true, 5
union all select (select id from categories where sort = 2),
  '{"pl":"Pielmieni z cielęciną","uk":"Пельмені з телятиною","ru":"Пельмени с телятиной"}'::jsonb,
  '{"pl":"Z cielęciną, na maśle","uk":"З телятиною, на маслі","ru":"С телятиной, на масле"}'::jsonb,
  3200, '/dishes/dish-26.webp', true, 6

-- ----- 3. Kotlety i mięso -----
union all select (select id from categories where sort = 3),
  '{"pl":"Kotlet po wiedeńsku","uk":"Котлета по-віденськи","ru":"Котлета по-венски"}'::jsonb,
  '{"pl":"Panierowany, z jajkiem sadzonym","uk":"Панірований, з яйцем","ru":"Панированный, с яйцом"}'::jsonb,
  3400, '/dishes/dish-02.webp', true, 1
union all select (select id from categories where sort = 3),
  '{"pl":"Kotlet de volaille","uk":"Котлета де-воляй","ru":"Котлета де-воляй"}'::jsonb,
  '{"pl":"Z masłem i ziołami","uk":"З маслом і зеленню","ru":"С маслом и зеленью"}'::jsonb,
  3600, '/dishes/dish-23.webp', true, 2
union all select (select id from categories where sort = 3),
  '{"pl":"Kotlet mielony","uk":"Січеник домашній","ru":"Котлета домашняя"}'::jsonb,
  '{"pl":"Z pieczonymi ziemniakami i surówką","uk":"З печеною картоплею та салатом","ru":"С печёным картофелем и салатом"}'::jsonb,
  2800, '/dishes/dish-10.webp', true, 3
union all select (select id from categories where sort = 3),
  '{"pl":"Kotlet z kurczaka","uk":"Котлета куряча","ru":"Котлета куриная"}'::jsonb,
  '{"pl":"Panierowany, z surówką z kapusty","uk":"Панірований, з капустяним салатом","ru":"Панированный, с капустным салатом"}'::jsonb,
  3000, '/dishes/dish-17.webp', true, 4
union all select (select id from categories where sort = 3),
  '{"pl":"Pieczone udko z kurczaka","uk":"Запечене куряче стегно","ru":"Запечённое куриное бедро"}'::jsonb,
  '{"pl":"Z młodymi ziemniakami","uk":"З молодою картоплею","ru":"С молодым картофелем"}'::jsonb,
  3200, '/dishes/dish-21.webp', true, 5
union all select (select id from categories where sort = 3),
  '{"pl":"Pieczona ćwiartka z kurczaka","uk":"Запечена чвертка курки","ru":"Запечённая четвертина курицы"}'::jsonb,
  '{"pl":"Z ziołami, ziemniakami i sałatą","uk":"З зеленню, картоплею та салатом","ru":"С зеленью, картофелем и салатом"}'::jsonb,
  3400, '/dishes/dish-28.webp', true, 6
union all select (select id from categories where sort = 3),
  '{"pl":"Kurczak pieczony z warzywami","uk":"Курка запечена з овочами","ru":"Курица запечённая с овощами"}'::jsonb,
  '{"pl":"Pół kurczaka, z warzywami","uk":"Пів курки, з овочами","ru":"Полкурицы, с овощами"}'::jsonb,
  3800, '/dishes/dish-12.webp', true, 7
union all select (select id from categories where sort = 3),
  '{"pl":"Kotlet schabowy","uk":"Шніцель зі свинини","ru":"Свиной шницель"}'::jsonb,
  '{"pl":"Klasyczny, z ziemniakami","uk":"Класичний, з картоплею","ru":"Классический, с картофелем"}'::jsonb,
  3000, '/dishes/dish-03.webp', false, 8

-- ----- 4. Naleśniki -----
union all select (select id from categories where sort = 4),
  '{"pl":"Naleśniki z serem","uk":"Налисники з сиром","ru":"Блины с творогом"}'::jsonb,
  '{"pl":"Z twarogiem i śmietaną","uk":"З сиром і сметаною","ru":"С творогом и сметаной"}'::jsonb,
  2200, '/dishes/dish-18.webp', true, 1
union all select (select id from categories where sort = 4),
  '{"pl":"Naleśniki z mięsem","uk":"Налисники з м''ясом","ru":"Блины с мясом"}'::jsonb,
  '{"pl":"Zapiekane, z wołowiną","uk":"Запечені, з яловичиною","ru":"Запечённые, с говядиной"}'::jsonb,
  2600, '/dishes/dish-27.webp', true, 2
union all select (select id from categories where sort = 4),
  '{"pl":"Naleśniki z jabłkami","uk":"Налисники з яблуками","ru":"Блины с яблоками"}'::jsonb,
  '{"pl":"Na słodko, z jabłkami i cynamonem","uk":"Солодкі, з яблуками та корицею","ru":"Сладкие, с яблоками и корицей"}'::jsonb,
  2200, '/dishes/dish-05.webp', true, 3

-- ----- 5. Ryby -----
union all select (select id from categories where sort = 5),
  '{"pl":"Ryba pieczona","uk":"Запечена риба","ru":"Запечённая рыба"}'::jsonb,
  '{"pl":"Z cytryną i ziołami","uk":"З лимоном і зеленню","ru":"С лимоном и зеленью"}'::jsonb,
  3800, '/dishes/dish-06.webp', true, 1
union all select (select id from categories where sort = 5),
  '{"pl":"Ryba w cieście","uk":"Риба в клярі","ru":"Рыба в кляре"}'::jsonb,
  '{"pl":"Chrupiąca, z ziemniakami","uk":"Хрустка, з картоплею","ru":"Хрустящая, с картофелем"}'::jsonb,
  3400, '/dishes/dish-29.webp', true, 2
union all select (select id from categories where sort = 5),
  '{"pl":"Smażony karp","uk":"Смажений короп","ru":"Жареный карп"}'::jsonb,
  '{"pl":"Cały, smażony, z cytryną","uk":"Цілий, смажений, з лимоном","ru":"Целый, жареный, с лимоном"}'::jsonb,
  4200, '/dishes/dish-19.webp', true, 3
union all select (select id from categories where sort = 5),
  '{"pl":"Filet z dorsza panierowany","uk":"Філе тріски паніроване","ru":"Филе трески панированное"}'::jsonb,
  '{"pl":"Z gotowanymi ziemniakami i surówką","uk":"З вареною картоплею та салатом","ru":"С варёным картофелем и салатом"}'::jsonb,
  3600, '/dishes/dish-25.webp', true, 4

-- ----- 6. Dania domowe -----
union all select (select id from categories where sort = 6),
  '{"pl":"Gołąbki","uk":"Голубці","ru":"Голубцы"}'::jsonb,
  '{"pl":"W sosie pomidorowym","uk":"У томатному соусі","ru":"В томатном соусе"}'::jsonb,
  2800, '/dishes/dish-13.webp', true, 1
union all select (select id from categories where sort = 6),
  '{"pl":"Risotto z kurczakiem","uk":"Різото з куркою","ru":"Ризотто с курицей"}'::jsonb,
  '{"pl":"Kremowe, z pieczarkami","uk":"Кремове, з печерицями","ru":"Кремовое, с шампиньонами"}'::jsonb,
  3000, '/dishes/dish-07.webp', true, 2
union all select (select id from categories where sort = 6),
  '{"pl":"Risotto z grzybami","uk":"Різото з грибами","ru":"Ризотто с грибами"}'::jsonb,
  '{"pl":"Kremowe, z borowikami","uk":"Кремове, з білими грибами","ru":"Кремовое, с белыми грибами"}'::jsonb,
  2800, '/dishes/dish-09.webp', true, 3;

-- ===== Options =====
-- Size options on the Wiener cutlet
with d as (select id from dishes where name->>'pl' = 'Kotlet po wiedeńsku' limit 1),
     g as (
       insert into option_groups (dish_id, name, min_select, max_select, required, sort)
       select id, '{"pl":"Rozmiar","uk":"Розмір","ru":"Размер"}'::jsonb, 1, 1, true, 1 from d
       returning id
     )
insert into options (option_group_id, name, price_delta, sort)
select id, '{"pl":"Standard","uk":"Стандарт","ru":"Стандарт"}'::jsonb, 0, 1 from g
union all
select id, '{"pl":"XL","uk":"XL","ru":"XL"}'::jsonb, 900, 2 from g;

-- Add-ons on the pierogi ruskie
with d as (select id from dishes where name->>'pl' = 'Pierogi ruskie' limit 1),
     g as (
       insert into option_groups (dish_id, name, min_select, max_select, required, sort)
       select id, '{"pl":"Dodatki","uk":"Додатки","ru":"Добавки"}'::jsonb, 0, 2, false, 1 from d
       returning id
     )
insert into options (option_group_id, name, price_delta, sort)
select id, '{"pl":"Śmietana","uk":"Сметана","ru":"Сметана"}'::jsonb, 200, 1 from g
union all
select id, '{"pl":"Skwarki","uk":"Шкварки","ru":"Шкварки"}'::jsonb, 300, 2 from g;

-- Optional side dish ("Na dodatek") on every main course (Kotlety i mięso + Ryby)
with mains as (
  select d.id from dishes d
  join categories c on c.id = d.category_id
  where c.sort in (3, 5)
),
g as (
  insert into option_groups (dish_id, name, min_select, max_select, required, sort)
  select id, '{"pl":"Na dodatek","uk":"На гарнір","ru":"На гарнир"}'::jsonb, 0, 1, false, 2 from mains
  returning id
)
insert into options (option_group_id, name, price_delta, sort)
select g.id, s.name, s.delta, s.sort
from g
cross join (values
  ('{"pl":"Ziemniaki opiekane","uk":"Смажена картопля","ru":"Жареный картофель"}'::jsonb, 0, 1),
  ('{"pl":"Frytki","uk":"Картопля фрі","ru":"Картофель фри"}'::jsonb, 400, 2),
  ('{"pl":"Kasza gryczana","uk":"Гречана каша","ru":"Гречневая каша"}'::jsonb, 0, 3),
  ('{"pl":"Ryż","uk":"Рис","ru":"Рис"}'::jsonb, 200, 4),
  ('{"pl":"Surówka","uk":"Салат","ru":"Салат"}'::jsonb, 0, 5)
) as s(name, delta, sort);

-- ===== Restaurant settings (singleton) =====
insert into restaurant_settings (id, name, phone, address_text, lat, lng, delivery_radius_m,
  delivery_fee, free_delivery_threshold, min_order, hours, prep_lead_minutes)
values (true, 'Smacznego', '+48 500 100 200', 'ul. Przykładowa 1, Warszawa',
  52.2297, 21.0122, 8000, 800, 6000, 3000,
  '{"mon":{"open":"11:00","close":"22:00"},"tue":{"open":"11:00","close":"22:00"},"wed":{"open":"11:00","close":"22:00"},"thu":{"open":"11:00","close":"22:00"},"fri":{"open":"11:00","close":"23:00"},"sat":{"open":"12:00","close":"23:00"},"sun":{"open":"12:00","close":"21:00"}}'::jsonb,
  40);
