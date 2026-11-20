-- ISTEM RESEARCH · Migración 002: catálogo geográfico inicial de República Dominicana.
-- 31 provincias y el Distrito Nacional. Los códigos siguen la numeración provincial usada por la ONE;
-- verified_at queda en null hasta contrastarlos con la publicación oficial vigente (ver docs/04-base-de-datos.md).
-- Municipios y distritos municipales se cargarán desde la fuente oficial en la fase 6 (ISTEM GEO), no a mano.
begin;
insert into public.geo_areas (code, country_code, level, parent_code, name, official_code, source, verified_at) values
  ('DO', 'DO', 'pais', null, 'República Dominicana', 'DO', 'ISO 3166-1', null)
on conflict (code) do update set name = excluded.name;
insert into public.geo_areas (code, country_code, level, parent_code, name, official_code, source, verified_at) values
  ('DO-01', 'DO', 'provincia', 'DO', 'Distrito Nacional', '01', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-02', 'DO', 'provincia', 'DO', 'Azua', '02', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-03', 'DO', 'provincia', 'DO', 'Bahoruco', '03', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-04', 'DO', 'provincia', 'DO', 'Barahona', '04', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-05', 'DO', 'provincia', 'DO', 'Dajabón', '05', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-06', 'DO', 'provincia', 'DO', 'Duarte', '06', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-07', 'DO', 'provincia', 'DO', 'Elías Piña', '07', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-08', 'DO', 'provincia', 'DO', 'El Seibo', '08', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-09', 'DO', 'provincia', 'DO', 'Espaillat', '09', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-10', 'DO', 'provincia', 'DO', 'Independencia', '10', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-11', 'DO', 'provincia', 'DO', 'La Altagracia', '11', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-12', 'DO', 'provincia', 'DO', 'La Romana', '12', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-13', 'DO', 'provincia', 'DO', 'La Vega', '13', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-14', 'DO', 'provincia', 'DO', 'María Trinidad Sánchez', '14', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-15', 'DO', 'provincia', 'DO', 'Monte Cristi', '15', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-16', 'DO', 'provincia', 'DO', 'Pedernales', '16', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-17', 'DO', 'provincia', 'DO', 'Peravia', '17', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-18', 'DO', 'provincia', 'DO', 'Puerto Plata', '18', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-19', 'DO', 'provincia', 'DO', 'Hermanas Mirabal', '19', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-20', 'DO', 'provincia', 'DO', 'Samaná', '20', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-21', 'DO', 'provincia', 'DO', 'San Cristóbal', '21', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-22', 'DO', 'provincia', 'DO', 'San Juan', '22', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-23', 'DO', 'provincia', 'DO', 'San Pedro de Macorís', '23', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-24', 'DO', 'provincia', 'DO', 'Sánchez Ramírez', '24', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-25', 'DO', 'provincia', 'DO', 'Santiago', '25', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-26', 'DO', 'provincia', 'DO', 'Santiago Rodríguez', '26', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-27', 'DO', 'provincia', 'DO', 'Valverde', '27', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-28', 'DO', 'provincia', 'DO', 'Monseñor Nouel', '28', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-29', 'DO', 'provincia', 'DO', 'Monte Plata', '29', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-30', 'DO', 'provincia', 'DO', 'Hato Mayor', '30', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-31', 'DO', 'provincia', 'DO', 'San José de Ocoa', '31', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null),
  ('DO-32', 'DO', 'provincia', 'DO', 'Santo Domingo', '32', 'ONE - División territorial (codificación provincial). Pendiente de verificación documental.', null)
on conflict (code) do update set name = excluded.name, official_code = excluded.official_code, source = excluded.source;
commit;
