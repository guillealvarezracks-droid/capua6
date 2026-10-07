-- MIGRACIÓN: control de acceso por personal autorizado (no por "cualquier
-- autenticado"). YA APLICADA en producción (27/09/2026). Este archivo
-- documenta la versión FINAL y correcta, para que quien lo lea después
-- sepa exactamente qué hay desplegado — no la primera versión que se
-- ejecutó, que tenía un fallo (ver más abajo).
--
-- Cuentas autorizadas en el momento de aplicarla:
--   info@capua6.com                  (dueño)
--   alvarezrodriguezguille@gmail.com (cuenta de pruebas/desarrollo)
-- El padre no tenía cuenta todavía: se añade con un INSERT igual que estos
-- en personal_autorizado cuando exista (ver más abajo).
--
-- Qué cambia respecto a antes:
--   - Antes: cualquier cuenta con sesión iniciada (auth.role() = 'authenticated')
--     tenía acceso total a reservas/pagos/bloqueos.
--   - Después: solo las cuentas que aparezcan en la tabla personal_autorizado.
--     Una cuenta autenticada pero NO autorizada se queda exactamente igual
--     que un visitante anónimo: sin ver ni escribir nada.
--
-- FALLO DE LA PRIMERA VERSIÓN (corregido en esta): la tabla
-- personal_autorizado tiene RLS activado y, a propósito, CERO políticas —
-- así nadie puede leerla/escribirla desde la app y nadie puede auto-
-- concederse acceso. Pero eso significa que una condición de política que
-- lea esa tabla DIRECTAMENTE (`exists (select 1 from personal_autorizado...)`)
-- también queda bloqueada por esa misma ausencia de políticas — incluso
-- para las cuentas legítimas. Es un efecto de cómo Postgres aplica RLS a
-- las subconsultas: una subconsulta contra una tabla con RLS sigue las
-- políticas de ESA tabla, no las de la tabla que la está consultando.
-- La primera vez que se aplicó esto dejó las reservas "invisibles" (no
-- borradas: solo invisibles) para todo el mundo durante unos minutos.
--
-- La solución correcta (la de este archivo) es el patrón recomendado por
-- el propio Supabase para este caso: una función SECURITY DEFINER, que sí
-- puede leer personal_autorizado por dentro (se ejecuta con los permisos
-- de quien la creó, no con los del usuario que llama), y que solo se deja
-- EJECUTAR (nunca escribir en la tabla) a las cuentas autenticadas.

begin;

-- 1) Tabla de personal autorizado -------------------------------------------
create table if not exists personal_autorizado (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
alter table personal_autorizado enable row level security;
-- (Intencionadamente sin ninguna política: nadie tiene acceso vía API. Solo
-- se añade o quita gente desde el SQL Editor, con tu login de Supabase.)

-- 2) Rellenar con las cuentas autorizadas -----------------------------------
insert into personal_autorizado (user_id, email) values
  ('0e19fad2-30f1-4c69-a831-c331a6c221f1', 'info@capua6.com'),
  ('5b221b14-2ced-4e75-bfda-181af40d64fe', 'alvarezrodriguezguille@gmail.com')
on conflict (user_id) do nothing;

-- Cuando el padre tenga cuenta, añadirlo así (con su UUID real, visto en
-- Authentication → Users o con "select id, email from auth.users;"):
-- insert into personal_autorizado (user_id, email) values
--   ('SU-UUID-AQUI', 'email-del-padre@ejemplo.com');

-- 3) Función que comprueba pertenencia, sin exponer la tabla directamente --
create or replace function es_personal_autorizado()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from personal_autorizado p where p.user_id = auth.uid()
  );
$$;
revoke all on function es_personal_autorizado() from public;
grant execute on function es_personal_autorizado() to authenticated;
-- Nota: "anon" no tiene permiso de ejecutar esta función — ni falta que
-- hace, ya que las políticas de abajo no dejan pasar a "anon" de todas
-- formas (la función solo devolvería false). El acceso público sigue
-- limitado exclusivamente a disponibilidad_publica(), que no se toca aquí.

-- 4) Políticas de reservas/pagos/bloqueos, basadas en esa función ----------
drop policy if exists "staff acceso total reservas" on reservas;
drop policy if exists "personal autorizado reservas" on reservas;
create policy "personal autorizado reservas" on reservas
  for all using (es_personal_autorizado()) with check (es_personal_autorizado());

drop policy if exists "staff acceso total pagos" on pagos;
drop policy if exists "personal autorizado pagos" on pagos;
create policy "personal autorizado pagos" on pagos
  for all using (es_personal_autorizado()) with check (es_personal_autorizado());

drop policy if exists "staff acceso total bloqueos" on bloqueos;
drop policy if exists "personal autorizado bloqueos" on bloqueos;
create policy "personal autorizado bloqueos" on bloqueos
  for all using (es_personal_autorizado()) with check (es_personal_autorizado());

commit;

-- Comprobación: debería devolver exactamente las cuentas autorizadas.
select email from personal_autorizado order by email;
