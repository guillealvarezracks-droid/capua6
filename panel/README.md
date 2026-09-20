# Panel interno de reservas — Capua 6

> **Estado: conectado a datos reales.** Desde este cambio, el panel guarda
> las reservas en una base de datos real (Supabase), protegida por login.
> Ya no hay banner de demostración ni botón de "reiniciar datos demo": lo
> que se cree, edite o borre aquí es de verdad. No se han cargado datos
> ficticios en la base de datos real — empieza vacía.

## 1. Qué es esto

El panel de gestión interna de reservas de Capua 6: agenda, calendario
mensual, ficha de reserva/pagos y gestión de fechas bloqueadas. Vive en
`panel/`, separado por completo de la web pública (`index.html`,
`styles.css`, `app.js` en la raíz del proyecto no se han tocado en ningún
momento).

Empezó como una maqueta con datos ficticios en `localStorage` (fase 1) y
ahora, tras revisarla y aprobarla, está conectada a un proyecto real de
Supabase (fase 2). El diseño en capas se pensó desde el principio para que
ese salto no obligara a rehacer pantallas — ver el punto 3.

## 2. Cómo entrar

Es la misma URL de siempre del panel (dentro del despliegue de GitHub
Pages). Al abrirla, pide **email y contraseña**: solo entran las cuentas
dadas de alta en Supabase (el dueño y su padre). Sin sesión iniciada, la
pantalla de login es lo único que se ve — ni una fila de datos sale hacia
el navegador sin haber iniciado sesión (lo impone la base de datos, no solo
la pantalla de login).

Para desarrollo local (abrir el código en tu propio ordenador antes de
subir cambios): hace falta un servidor local simple, porque los módulos ES
no cargan por `file://`:

```bash
cd panel
npx serve .          # o: python -m http.server 8000
```

## 3. Estructura (sigue siendo la misma, solo cambió una pieza)

Sin frameworks ni bundler — el mismo criterio que ya usa la web pública
(HTML + Tailwind por CDN + JS module nativo).

```
panel/
  index.html              shell: pantalla de login + pestañas + modal genérico
  panel.css                estilos propios del panel
  package.json             solo {"type":"module"} + script "test" — sin dependencias
  supabase-setup.sql       SQL para crear las tablas y los permisos (ya ejecutado)
  js/
    business-rules.js       reglas de negocio puras — SIN CAMBIOS en este paso
    business-rules.test.js  pruebas automáticas de esas reglas (Node, sin framework)
    supabase-config.js       URL del proyecto + clave pública de Supabase
    supabase-client.js       cliente de Supabase compartido (datos + login)
    data-layer.js             habla con Supabase — única pieza reescrita en este paso
    demo-seed.js              datos ficticios de la fase de maqueta, YA NO usados
    app.js                    UI: login/logout, estado, pantallas, formularios, modales
```

La separación en capas es la que ya permitió este cambio sin rehacer nada:

1. **`business-rules.js`** — aforo, mínimos, horarios, precios de
   referencia, estados de pago, conflictos de disponibilidad. No sabe nada
   de dónde viven los datos. **No se ha tocado ni una línea** al pasar a
   Supabase.
2. **`data-layer.js`** — antes hablaba con `localStorage`, ahora habla con
   Supabase, pero de fuera se ve exactamente igual: `ReservasRepo.listar()`,
   `.crear()`, `.actualizar()`, `.añadirPago()`... todas las pantallas
   siguen llamando a estos mismos métodos sin saber qué hay detrás.
3. **`app.js`** — se le ha añadido la pantalla de login/logout y se le ha
   quitado lo específico de la maqueta (banner de demo, botón de reset).
   El resto de pantallas no ha cambiado.

## 4. La base de datos

Tres tablas en Postgres (ver `supabase-setup.sql`, ya ejecutado en el
proyecto): `reservas`, `pagos` (con su `reserva_id` apuntando a la
reserva) y `bloqueos`. Los nombres de columna son el equivalente en
`snake_case` de los campos que ya usaba la maqueta (`client_name`,
`start_date`, `is_holiday_eve`...); `data-layer.js` hace la conversión de
ida y vuelta.

**Seguridad (RLS — Row Level Security):** las tres tablas tienen activada
la seguridad por fila con una política que exige sesión iniciada
(`auth.role() = 'authenticated'`) para leer o escribir cualquier cosa. Esto
es importante: la protección no depende de que el código de la pantalla
oculte botones o no muestre datos — aunque alguien abriera la URL del panel
sin haber iniciado sesión, la base de datos no le devolvería ni una fila.

La clave que lleva el panel en el navegador (`supabase-config.js`, la
"publishable key") está pensada para eso: es pública a propósito, la
protección real la da RLS, no el secretismo de esa clave.

## 5. Qué se puede hacer ya con datos reales

- Iniciar y cerrar sesión (dueño y padre, cada uno con su propia cuenta).
- Ver la agenda (próximos/pasados), filtrar por estado.
- Ver el calendario mensual con indicadores de confirmada/consulta-pendiente/bloqueada.
- Crear una consulta/reserva, con cálculo automático de hora de fin y
  precio de referencia según la modalidad (siempre editables a mano).
- Confirmar una reserva (aforo, mínimo, horario, fecha bloqueada, conflicto
  con otra confirmada — todo comprobado antes de guardar).
- Cancelar una reserva (conserva el historial de pagos, no borra nada, no
  inventa una devolución).
- Registrar y quitar pagos, ver el estado de pago y el importe pendiente.
- Bloquear y desbloquear fechas, con motivo interno.

## 6. Pruebas realizadas

### 6.1 Automáticas (Node, reglas de negocio)

```
cd panel
node js/business-rules.test.js
```

**34 pasadas, 0 fallidas** — sin cambios respecto a la fase de maqueta,
porque `business-rules.js` no se ha tocado.

### 6.2 Manuales en navegador, fase de maqueta (localStorage)

Antes de conectar Supabase se probaron a fondo, con clics e interacción
real (no solo revisando código), estos escenarios: creación con cálculo
automático de fin/precio, rechazo por aforo máximo, doble confirmación en
la misma fecha, bloqueo de fechas, cancelación conservando pagos, rechazo
por mínimo de personas, rechazo al confirmar en fecha bloqueada, aforo en
el límite exacto, y reinicio de datos. Todos correctos; se encontraron y
corrigieron dos fallos reales (un `max` nativo del navegador que tapaba
nuestro propio aviso de aforo, y un desfase de un día en la cuadrícula del
calendario). Todo esto sigue aplicando tal cual porque es la misma interfaz
y las mismas reglas de negocio — lo único que cambió por debajo es de dónde
vienen y a dónde van los datos.

### 6.3 Verificado ya contra el proyecto real de Supabase

- La página carga sin errores de JavaScript y muestra la pantalla de login
  (nunca el panel) mientras no hay sesión.
- Un intento de login con credenciales inexistentes se rechaza de verdad
  contra el servidor de Supabase, mostrando el aviso "No se pudo iniciar
  sesión" — confirma que el cliente está hablando con el proyecto real, no
  con datos simulados.

### 6.4 Pendiente de probar (necesita que existan los dos usuarios)

En cuanto deis de alta las cuentas del dueño y del padre en Supabase
(Authentication → Users), falta reprobar en caliente, ya con sesión real:
crear/editar/confirmar/cancelar una reserva, registrar un pago y bloquear
una fecha, comprobando que quedan guardados de verdad en la base de datos
(no solo en la pantalla). Avísame cuando estén creados los usuarios y lo
hacemos juntos antes de que entréis las primeras reservas reales de
verdad.

## 7. Qué sigue sin estar hecho (a propósito)

- **Política de devoluciones** al cancelar una reserva con señal pagada:
  no se ha inventado ninguna. El panel solo conserva el historial de pagos
  tal cual; decidir qué hacer con ese dinero es una decisión del negocio,
  no algo que debiera asumir el código.
- **Concurrencia estricta**: hoy, dos personas confirmando la misma fecha
  casi a la vez se detectan porque cada una comprueba conflictos contra los
  datos que acaba de leer, pero no hay un bloqueo a nivel de base de datos
  que lo impida de forma absoluta si el guardado ocurre en el mismísimo
  instante. Con el volumen de un solo local esto es un riesgo bajo, pero
  queda anotado como posible mejora futura (una restricción de exclusión en
  Postgres) si algún día hiciera falta.
- **Calendario público de disponibilidad**: sigue sin implementarse ni
  enlazarse desde la web pública. `calcularDisponibilidadPublica()` en
  `data-layer.js` sigue ahí, sin usar, demostrando cómo se separarían los
  datos públicos (`{fecha, disponible}`) de los privados el día que se
  decida construirlo de verdad.

## 8. Copia de seguridad

Los datos ahora viven en Supabase, no en este repositorio ni en el
navegador. Supabase (plan gratuito) guarda copias de seguridad automáticas
de los últimos días; si en algún momento quieres una exportación aparte
(por ejemplo, antes de un cambio grande), puedo generarla bajo petición.

---

`supabase-config.js` contiene la URL del proyecto y la clave pública
("publishable"): es intencionadamente público, como se explica en el punto
4. La contraseña de la base de datos y la "secret key" de Supabase no están
en ningún archivo de este repositorio ni se han compartido en ningún
momento con este asistente.
