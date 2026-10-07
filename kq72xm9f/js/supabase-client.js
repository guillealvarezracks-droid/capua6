// panel/js/supabase-client.js
//
// Cliente único de Supabase, reutilizado por data-layer.js (datos) y por
// app.js (login/logout). La librería se carga como <script> clásico en
// index.html (build UMD desde CDN, sin instalar nada ni usar bundler), y
// aquí solo se envuelve en un módulo ES para poder hacer `import`.
//
// IMPORTANTE: este archivo NO debe lanzar una excepción a nivel de módulo
// si la librería no llegó a cargar (por ejemplo, un bloqueador de anuncios,
// un DNS privado o una red móvil que corta el acceso al CDN). Si lo
// hiciera, TODO app.js dejaría de ejecutarse en silencio — ni siquiera se
// engancharía el formulario de login — y el botón "Entrar" recargaría la
// página en blanco sin ninguna explicación, exactamente el fallo que se
// detectó en móvil. En vez de eso, se exporta `supabase = null` y es
// app.js quien decide qué mostrar cuando falta.

import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

export const supabase = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;
