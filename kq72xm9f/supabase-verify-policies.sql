-- Consulta de SOLO LECTURA: no cambia nada. Pégala en el SQL Editor de
-- Supabase y pásame el resultado (texto o captura) para comparar lo que
-- hay REALMENTE desplegado contra lo que dice panel/supabase-setup.sql.

select
  tablename,
  policyname,
  cmd as comando,
  roles,
  qual as condicion_lectura,
  with_check as condicion_escritura
from pg_policies
where tablename in ('reservas', 'pagos', 'bloqueos')
order by tablename, policyname;

-- También interesa saber si RLS está realmente activado en las tres tablas
-- (debería salir 't' de "true" en las tres filas):
select relname as tabla, relrowsecurity as rls_activado
from pg_class
where relname in ('reservas', 'pagos', 'bloqueos');
