-- Copia todo esto y pégalo en el SQL Editor de Supabase, luego Run.
--
-- Crea una función de solo lectura que la web pública puede llamar SIN
-- iniciar sesión, pero que solo devuelve fecha + disponible (true/false)
-- para cada día del rango pedido — nunca nombres, teléfonos, modalidad,
-- precios, pagos ni motivos de bloqueo. Las tablas reservas/pagos/bloqueos
-- siguen totalmente protegidas por RLS como hasta ahora: esta función
-- puede leerlas por dentro (SECURITY DEFINER) precisamente para poder
-- calcular el resultado, pero solo expone hacia fuera esas dos columnas.

create or replace function disponibilidad_publica(desde date, hasta date)
returns table(fecha date, disponible boolean)
language sql
security definer
set search_path = public
as $$
  select gs::date as fecha,
    not exists (
      select 1 from reservas r
      where r.status = 'confirmada' and r.start_date = gs::date
    )
    and not exists (
      select 1 from bloqueos b where b.date = gs::date
    ) as disponible
  from generate_series(desde, hasta, interval '1 day') as gs;
$$;

-- Solo el rol público (visitantes sin sesión) y el del panel pueden llamarla;
-- nadie más tiene permiso por defecto sobre las funciones nuevas.
revoke all on function disponibilidad_publica(date, date) from public;
grant execute on function disponibilidad_publica(date, date) to anon;
grant execute on function disponibilidad_publica(date, date) to authenticated;
