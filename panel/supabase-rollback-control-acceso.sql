-- ROLLBACK de supabase-migration-control-acceso.sql (versión final, con la
-- función es_personal_autorizado()). Úsalo solo si necesitáis volver al
-- comportamiento anterior (cualquier cuenta autenticada con acceso total)
-- mientras se soluciona algún problema. El SQL Editor SIEMPRE funciona con
-- tu login de Supabase pase lo que pase con estas políticas — RLS nunca
-- bloquea el propio panel de Supabase, solo la API que usa la app. Así que
-- nunca os podéis quedar sin forma de arreglarlo.

begin;

drop policy if exists "personal autorizado reservas" on reservas;
create policy "staff acceso total reservas" on reservas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "personal autorizado pagos" on pagos;
create policy "staff acceso total pagos" on pagos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "personal autorizado bloqueos" on bloqueos;
create policy "staff acceso total bloqueos" on bloqueos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

commit;

-- Nota: esto NO borra la tabla personal_autorizado ni la función
-- es_personal_autorizado() (por si queréis reintentarlo luego sin tener
-- que recrearlas). Si quisierais borrarlas también, sería aparte y solo
-- si estáis seguros de que no las vais a necesitar:
-- drop function if exists es_personal_autorizado();
-- drop table if exists personal_autorizado;
