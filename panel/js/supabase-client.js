// panel/js/supabase-client.js
//
// Cliente único de Supabase, reutilizado por data-layer.js (datos) y por
// app.js (login/logout). La librería se carga como <script> clásico en
// index.html (build UMD desde CDN, sin instalar nada ni usar bundler), y
// aquí solo se envuelve en un módulo ES para poder hacer `import`.

import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

if (!window.supabase) {
  throw new Error(
    'No se ha cargado la librería de Supabase. Revisa que index.html incluya ' +
    'el <script> de @supabase/supabase-js ANTES del <script type="module" src="js/app.js">.'
  );
}

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
