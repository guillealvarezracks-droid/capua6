// panel/js/supabase-config.js
//
// Conexión al proyecto de Supabase real del panel.
//
// La "publishable key" está pensada para ir en el navegador (no es un
// secreto): la protección de verdad la da RLS (permisos por fila) en la
// base de datos — sin sesión iniciada, ninguna consulta devuelve datos,
// tenga esta clave quien la tenga. Por eso es segura de tener aquí, en un
// repositorio público.
//
// La "secret key" de Supabase, en cambio, NUNCA debe ir en este archivo ni
// en ningún sitio del frontend: da acceso total sin restricciones.

export const SUPABASE_URL = 'https://yeqeqethclksyjbrhcqm.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_rX2QVcxaR1MvP4TzOjOrjA_EGZe50vp';
