# Panel interno de reservas — Capua 6 (maqueta, fase 1)

> **Modo demostración.** Todo lo que hay en esta carpeta usa datos ficticios.
> No hay clientes reales, no hay backend real y no está enlazado desde la web
> pública. No se ha hecho `git commit` ni `git push` de nada de esto: está
> pendiente de que lo revises y lo apruebes.

## 1. Qué es esto

Una maqueta **funcional** (no solo un diseño estático) del futuro panel de
gestión interna de reservas: agenda, calendario mensual, ficha de
reserva/pagos y gestión de fechas bloqueadas. Vive en `panel/`, separada por
completo de la web pública (`index.html`, `styles.css`, `app.js` en la raíz
del proyecto no se han tocado).

## 2. Cómo abrirlo

Los archivos de `panel/js/*.js` usan `import`/`export` (módulos ES). Los
navegadores bloquean módulos cargados directamente desde `file://` por CORS,
así que hace falta un servidor local muy simple (no build, no instalación):

```bash
cd panel
npx serve .          # o: python -m http.server 8000
```

o, si tienes Node y prefieres no instalar nada, cualquier servidor estático
que sirva la carpeta `panel/` vale. Abre después `http://localhost:PUERTO/`
en el navegador. Al cargar, si es la primera vez, se rellena solo con datos
de demostración (ver `js/demo-seed.js`).

Hay un botón **"Reiniciar datos demo"** arriba a la derecha por si quieres
volver al punto de partida después de trastear.

## 3. Estructura elegida (antes de implementar, como pediste)

Sin frameworks ni bundler — el mismo criterio que ya usa la web pública
(HTML + Tailwind por CDN + JS module nativo). Para el tamaño de este panel
habría sido sobre-ingeniería añadir React/Vue/una build tool.

```
panel/
  index.html          shell de la página: banner de demo, pestañas, modal genérico
  panel.css            estilos propios del panel (no toca styles.css de la web pública)
  package.json         solo {"type":"module"} + script "test" — sin dependencias
  js/
    business-rules.js       reglas de negocio puras (sin DOM, sin localStorage)
    business-rules.test.js  pruebas automáticas de esas reglas (Node, sin framework)
    data-layer.js            única pieza que toca localStorage — Repos async
    demo-seed.js              datos ficticios de partida
    app.js                    UI: estado, render de pantallas, formularios, modales
```

La idea central es la **separación en tres capas**, pensada ya para el
backend real del futuro:

1. **`business-rules.js`** — cálculo de horarios, aforo, mínimos, precios de
   referencia, estados de pago y conflictos de disponibilidad. Funciones
   puras: reciben datos, devuelven datos, no saben que existe un DOM ni un
   localStorage. Por eso se pueden probar con Node directamente y son las
   mismas que, el día de mañana, podrían ejecutarse en un servidor o una
   Cloud Function sin cambiar una línea.
2. **`data-layer.js`** — `ReservasRepo` y `BloqueosRepo`, con métodos
   **siempre asíncronos** (`async listar()`, `async crear()`...) aunque hoy
   por dentro solo llamen a `localStorage`. El día que haya un backend real,
   solo hay que reescribir el interior de este archivo (cambiar
   `localStorage.getItem` por `fetch('/api/...')`, por ejemplo): ninguna
   pantalla tiene que tocarse porque todas hablan con los Repos, no con
   `localStorage` directamente.
3. **`app.js`** — toda la interfaz. Usa las dos capas anteriores, nunca
   `localStorage` ni las reglas de negocio "a mano".

## 4. Qué se puede probar en esta maqueta

- Ver la agenda (próximos/pasados), filtrar por estado.
- Ver el calendario mensual con indicadores de confirmada/consulta-pendiente/bloqueada.
- Crear una consulta/reserva nueva, con cálculo automático de hora de fin y
  precio de referencia según la modalidad (siempre editables a mano).
- Confirmar una reserva (con todas las comprobaciones: aforo, mínimo,
  horario, fecha bloqueada, conflicto con otra confirmada).
- Cancelar una reserva (conserva el historial de pagos, no borra nada, no
  inventa una devolución).
- Registrar y quitar pagos, ver el estado de pago y el importe pendiente
  calculado en vivo.
- Bloquear y desbloquear fechas, con motivo interno (nunca se muestra en la
  ficha pública porque no existe ficha pública todavía).
- Reiniciar los datos de demostración.

## 5. Pruebas ejecutadas y resultado

### 5.1 Pruebas automáticas reales (Node, no simuladas)

```
cd panel
node js/business-rules.test.js
```

**Resultado: 34 pasadas, 0 fallidas.** Cubren: fin por defecto de cada
modalidad (incluida la Híbrida cruzando medianoche), evento que empieza
viernes y termina de madrugada del sábado (pertenece al viernes), límites de
cierre entre semana/fin de semana/víspera de festivo marcada a mano
(03:30 / 05:30) con casos borde, precio de referencia de la Espicha (por
persona) y la Híbrida (fijo), aforo máximo (50 sí / 51 no), mínimo de 20
personas en Espicha e Híbrida (Exclusiva sin mínimo), estados de pago
(sin_pagos/parcial/pagado/sin_precio) con el pendiente calculado bien,
conflictos de disponibilidad (misma fecha de inicio, solape de intervalos,
sin solape en reservas consecutivas, auto-exclusión al editar, que
consultas/pendientes no bloqueen), rechazo de doble confirmación en la misma
fecha, rechazo de confirmar en fecha bloqueada, acumulación de varios
errores a la vez, y validación de campos obligatorios.

### 5.2 Pruebas manuales en navegador (Chrome headless, interacción real)

Ejecutadas simulando clics y escritura reales sobre la interfaz servida en
`localhost` (no solo revisando el código):

| # | Escenario | Resultado |
|---|-----------|-----------|
| A | Crear consulta nueva: fin y precio de referencia se calculan solos (Espicha 21:00 → 03:00, 25 personas → 700 €) | ✅ correcto |
| B | Rechazo por aforo máximo (60 personas): mensaje "El aforo máximo es de 50 personas." | ✅ correcto (tras el fix del punto 6) |
| C | Confirmar una reserva y luego intentar confirmar otra consulta con la misma fecha de inicio: la segunda se rechaza acumulando error de horario + "La fecha choca con otra reserva ya confirmada" | ✅ correcto |
| D | Bloquear una fecha nueva: aparece en Bloqueos y en el Calendario | ✅ correcto |
| E | Registrar un pago, cancelar la reserva, reabrir la ficha: sigue "Cancelada" y el pago sigue ahí | ✅ correcto |
| F | Rechazo por mínimo de personas (Espicha con 10): "Espicha requiere un mínimo de 20 personas." | ✅ correcto |
| G | Intentar confirmar una reserva en una fecha ya bloqueada: "Esa fecha está bloqueada y no se puede confirmar." | ✅ correcto |
| H | Aforo en el límite exacto (50 personas): se acepta sin error | ✅ correcto |
| I | "Reiniciar datos demo" restaura las 8 reservas y el bloqueo de partida | ✅ correcto |
| — | Capturas de pantalla en móvil (390px) y escritorio (1280px) de agenda, calendario, bloqueos, ficha y formulario | ✅ sin desbordes horizontales ni solapes |
| — | Consola del navegador sin excepciones JS en ningún escenario | ✅ (único aviso: el 404 automático del favicon, irrelevante) |

**Dos fallos reales se encontraron y se corrigieron durante estas pruebas**
(no solo se comprobó que "funciona", se usó para depurar):

1. El campo de asistentes tenía un `max="50"` nativo del navegador que
   interceptaba el envío del formulario antes de que corriera la validación
   propia del panel, así que el aviso de "aforo máximo" nunca llegaba a
   mostrarse (el navegador paraba el envío con su propio aviso genérico).
   Se añadió `novalidate` al formulario de reserva para que sea siempre
   nuestra validación, con sus mensajes en español, la que decida.
2. La cuadrícula del calendario mensual tenía el desfase de días calculado
   para una semana empezando en lunes, pero la cabecera de columnas empezaba
   en domingo: los días aparecían una columna desplazados (por ejemplo, hoy
   —domingo— salía bajo la columna "sáb"). Se corrigió el cálculo del
   desfase para que coincida con la cabecera domingo-primero.

### 5.3 Qué queda solo "planeado", no probado (porque haría falta un backend real)

- **Concurrencia real**: dos personas confirmando la misma fecha en el mismo
  instante desde dos dispositivos distintos. Con `localStorage` esto no
  existe de verdad (cada dispositivo tiene su propia copia de los datos, sin
  sincronizar), así que no se puede probar aquí — es precisamente el motivo
  por el que hace falta una base de datos real con escritura atómica antes
  de usar esto con clientes reales.
- **Persistencia entre dispositivos**: por diseño, no se puede probar
  porque `localStorage` no la tiene.
- **Seguridad de acceso**: no hay login real que probar todavía (a
  propósito, ver punto 7).

## 6. Qué es simulado y qué no

| Simulado (solo en esta maqueta) | Real (funciona de verdad) |
|---|---|
| Los datos: nombres, teléfonos, importes — todo ficticio | Toda la lógica de negocio: cálculo de horarios, precios de referencia, validaciones, detección de conflictos |
| El almacenamiento: `localStorage` del navegador, no una base de datos | La separación de capas (reglas / datos / interfaz), lista para enchufar un backend real |
| "Reiniciar datos demo" (no existiría en producción tal cual) | La interacción: crear, editar, confirmar, cancelar, pagar, bloquear — todo hace cambios reales en los datos (de demostración) y se refleja al instante |
| No hay usuarios ni sesiones — cualquiera que abra el archivo ve y edita todo | — |

## 7. Qué haría falta para pasar a datos reales

1. **Una base de datos real** detrás de `data-layer.js` (sustituyendo el
   interior de `ReservasRepo`/`BloqueosRepo`, sin tocar `app.js` ni
   `business-rules.js`).
2. **Autenticación real** para quien gestione el panel — hoy no hay ningún
   login, ni siquiera de mentira: se decidió a propósito no simular un login
   que diera una falsa sensación de seguridad.
3. **Un dominio/hosting privado** para el panel, distinto de GitHub Pages
   público (o protegido si se queda ahí), porque va a manejar datos
   personales de clientes (nombre, teléfono) que no deben ser públicos.
4. **Decidir la política de devoluciones** cuando se cancela una reserva con
   señal pagada — deliberadamente no se ha inventado ninguna en esta
   maqueta; hoy solo se conserva el historial de pagos tal cual.
5. **Un calendario público de disponibilidad** (sección aparte, ver punto 8)
   si se quiere mostrar en la web qué fechas están libres.

## 8. Preparado para el futuro calendario público (sin implementarlo)

En `data-layer.js` existe `calcularDisponibilidadPublica(fechas)`, **sin
usar en ninguna pantalla ni enlazada desde la web pública**. Solo demuestra
la separación: coge los mismos datos que usa el panel privado y devuelve
ÚNICAMENTE `{ date, available }` por fecha — nunca nombres, teléfonos,
modalidad, asistentes, horas exactas, precios, pagos, notas ni motivos de
bloqueo.

Esto es importante para cuando se construya de verdad: **ocultar campos en
pantalla no basta**. Si la web pública llega a pedir datos de reservas a un
backend, ese backend debe devolver desde el servidor solo `{fecha,
disponible}` — los datos privados no deben ni salir hacia el navegador del
visitante, aunque luego no se pinten. `calcularDisponibilidadPublica` es el
sitio donde ese recorte ya ocurre, listo para que un futuro endpoint público
lo use tal cual.

## 9. Backend recomendado (sin contratar ni conectar nada)

Para una necesidad de este tamaño (un solo local, un panel con pocos
usuarios internos, un volumen de reservas bajo), recomendaría:

**Supabase** (Postgres gestionado + autenticación integrada) o, como
alternativa igual de razonable, **Firebase** (Firestore + Authentication).

Por qué:

- Ambos dan **base de datos + autenticación de usuarios reales** en el mismo
  servicio, sin tener que montar y mantener un servidor propio — encaja con
  no haber querido meter secretos ni servicios externos todavía en esta
  fase.
- La forma de acceder a los datos (colecciones/documentos o tablas simples)
  encaja de forma casi directa con la forma en que ya está pensado
  `ReservasRepo`/`BloqueosRepo`: sustituir el interior de esos métodos es un
  cambio contenido, no una reescritura de las pantallas.
- Tienen capa gratuita suficiente para el volumen de un solo local.
- Autenticación real (usuario/contraseña o enlace mágico) para el personal
  que gestione el panel, en vez del "sin login" actual.

Lo que implicaría dar ese paso (para que se sepa de antemano, no para
hacerlo ahora):

- Dar de alta una cuenta y un proyecto en el servicio elegido.
- Migrar los datos de `localStorage` a la base de datos real (aquí sí, con
  datos reales de clientes, dejando de ser una maqueta).
- Añadir un login real para quien use el panel, y decidir quién tiene
  acceso.
- Sacar el panel de una carpeta pública de GitHub Pages a un sitio no
  indexado/protegido, ya que pasaría a tener datos personales reales.
- Revisar entonces la política de protección de datos aplicable (los
  clientes cuyos teléfonos y reservas se guarden).

---

Repite: esta carpeta no se ha subido a GitHub. Está a la espera de revisión
y aprobación antes de cualquier `git add`/`commit`/`push`.
