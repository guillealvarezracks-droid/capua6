// panel/js/business-rules.js
//
// Reglas de negocio puras del panel de Capua 6.
// Sin efectos secundarios, sin acceso a localStorage ni al DOM: todo son
// funciones que reciben datos y devuelven datos. Por eso se pueden probar
// directamente con Node (ver business-rules.test.js) y reutilizar tal cual
// el día que exista un backend real (las mismas funciones podrían ejecutarse
// en un servidor o en una Cloud Function).
//
// Fechas y horas: se trabaja siempre en "hora de pared" (wall-clock) de
// Europe/Madrid. Sumar horas es aritmética de calendario (HH:MM + horas,
// con acarreo de día), NUNCA una conversión a UTC con un desfase fijo.
// Esto evita el bug típico de asumir "UTC+1" o "UTC+2" todo el año.
// Limitación conocida: como no convertimos a tiempo real (epoch), un evento
// que atraviese exactamente la noche del cambio de hora (última madrugada
// de marzo u octubre) se calcula igualmente en horas de reloj, no en horas
// reales transcurridas. Son 2 noches al año y el negocio piensa en horario
// de pared ("cierra a las 05:30"), así que es el comportamiento correcto
// para este caso de uso, no un descuido.

export const AFORO_MAXIMO = 50;

export const MODALIDADES = {
  espicha: {
    key: 'espicha',
    label: 'Espicha',
    minAsistentes: 20,
    duracionHoras: 6,
    precioReferencia: 28,
    precioPorPersona: true,
  },
  hibrida: {
    key: 'hibrida',
    label: 'Híbrida',
    minAsistentes: 20,
    duracionHoras: 6,
    precioReferencia: 200,
    precioPorPersona: false,
  },
  exclusiva: {
    key: 'exclusiva',
    label: 'Exclusiva',
    minAsistentes: 0,
    duracionHoras: 7,
    precioReferencia: 500,
    precioPorPersona: false,
  },
  medida: {
    key: 'medida',
    label: 'Evento a medida',
    minAsistentes: 0,
    duracionHoras: null, // se introduce a mano
    precioReferencia: null, // se introduce a mano
    precioPorPersona: false,
  },
};

export function getModalidad(key) {
  return MODALIDADES[key] || null;
}

export function listaModalidades() {
  return Object.values(MODALIDADES);
}

// Precio de referencia SUGERIDO (no vinculante). Sirve solo para rellenar el
// formulario; el precio finalmente acordado siempre se puede sobrescribir a
// mano y, una vez guardado, no se debe recalcular solo porque cambien otros
// datos (ver reglas de uso en data-layer.js / UI).
export function precioReferencia(modalidadKey, asistentes) {
  const m = MODALIDADES[modalidadKey];
  if (!m || m.precioReferencia == null) return null;
  return m.precioPorPersona ? m.precioReferencia * (Number(asistentes) || 0) : m.precioReferencia;
}

// --- Fechas / horas ---------------------------------------------------

function pad2(n) {
  return String(n).padStart(2, '0');
}

function fechaAISO(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Día de la semana (0=domingo .. 6=sábado) de una fecha 'YYYY-MM-DD',
// calculado con componentes locales (sin pasar por horas ni TZ real).
export function weekdayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

// Suma horas (puede llevar decimales) a una fecha+hora en aritmética de
// calendario. startDate: 'YYYY-MM-DD', startTime: 'HH:MM'.
// Devuelve { endDate, endTime }.
export function sumarHoras(startDate, startTime, horas) {
  const [y, m, d] = startDate.split('-').map(Number);
  const [hh, mm] = startTime.split(':').map(Number);
  const totalMin = hh * 60 + mm + Math.round(Number(horas) * 60);
  const diasExtra = Math.floor(totalMin / (24 * 60));
  let restoMin = totalMin % (24 * 60);
  if (restoMin < 0) restoMin += 24 * 60;
  const base = new Date(y, m - 1, d);
  base.setDate(base.getDate() + diasExtra);
  return {
    endDate: fechaAISO(base),
    endTime: `${pad2(Math.floor(restoMin / 60))}:${pad2(restoMin % 60)}`,
  };
}

// Fin por defecto según la modalidad. Para 'medida' no hay valor por
// defecto: hay que introducirlo a mano (devuelve null).
export function calcularFinPorDefecto(modalidadKey, startDate, startTime) {
  const m = MODALIDADES[modalidadKey];
  if (!m || m.duracionHoras == null) return null;
  return sumarHoras(startDate, startTime, m.duracionHoras);
}

// Tope máximo de cierre para una reserva que EMPIEZA en startDate.
// - Domingo a jueves: 03:30 de la madrugada siguiente.
// - Viernes, sábado o víspera de festivo (marcada a mano): 05:30 de la
//   madrugada siguiente.
export function limiteMaximoCierre(startDate, esVisperaFestivo) {
  const dow = weekdayOf(startDate); // 0=domingo..6=sábado
  const esViernesOSabado = dow === 5 || dow === 6;
  const horaLimite = (esViernesOSabado || esVisperaFestivo) ? '05:30' : '03:30';
  const [y, m, d] = startDate.split('-').map(Number);
  const siguiente = new Date(y, m - 1, d);
  siguiente.setDate(siguiente.getDate() + 1);
  return { endDate: fechaAISO(siguiente), endTime: horaLimite };
}

// Convierte fecha+hora en una cadena comparable cronológicamente
// ('YYYY-MM-DDTHH:MM'). Válido para comparar con < <= > >= porque el
// formato está siempre normalizado con ceros a la izquierda.
export function toComparable(date, time) {
  return `${date}T${time}`;
}

// ¿El fin propuesto respeta el horario autorizado para esa fecha de inicio?
export function dentroDelLimite(startDate, endDate, endTime, esVisperaFestivo) {
  const limite = limiteMaximoCierre(startDate, esVisperaFestivo);
  return toComparable(endDate, endTime) <= toComparable(limite.endDate, limite.endTime);
}

// A efectos de "reserva diaria" (agenda, disponibilidad, conflictos), un
// evento pertenece siempre a su fecha de INICIO, aunque termine de
// madrugada al día siguiente.
export function diaDeReserva(startDate) {
  return startDate;
}

// --- Validaciones -------------------------------------------------------

export function validarAforo(asistentes) {
  const n = Number(asistentes);
  if (!asistentes || Number.isNaN(n) || n <= 0) return 'Indica el número de asistentes.';
  if (n > AFORO_MAXIMO) return `El aforo máximo es de ${AFORO_MAXIMO} personas.`;
  return null;
}

export function validarMinimo(modalidadKey, asistentes) {
  const m = MODALIDADES[modalidadKey];
  if (!m) return 'Modalidad no reconocida.';
  const n = Number(asistentes) || 0;
  if (m.minAsistentes && n < m.minAsistentes) {
    return `${m.label} requiere un mínimo de ${m.minAsistentes} personas.`;
  }
  return null;
}

export function validarCamposObligatorios(datos) {
  const errores = [];
  if (!datos.clientName || !datos.clientName.trim()) errores.push('Falta el nombre del cliente.');
  if (!datos.clientPhone || !datos.clientPhone.trim()) errores.push('Falta el teléfono del cliente.');
  if (!datos.modality || !MODALIDADES[datos.modality]) errores.push('Falta indicar la modalidad.');
  if (!datos.startDate) errores.push('Falta la fecha de inicio.');
  if (!datos.startTime) errores.push('Falta la hora de inicio.');
  if (!datos.endDate || !datos.endTime) errores.push('Falta la fecha/hora de finalización.');
  return errores;
}

// --- Pagos ---------------------------------------------------------------

export function totalPagado(pagos) {
  return (pagos || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

// Estados posibles: 'sin_precio' | 'sin_pagos' | 'parcial' | 'pagado'
export function estadoPago(precioTotal, pagos) {
  const pagado = totalPagado(pagos);
  if (precioTotal == null || precioTotal <= 0) {
    return pagado > 0 ? 'parcial' : 'sin_precio';
  }
  if (pagado <= 0) return 'sin_pagos';
  if (pagado >= precioTotal) return 'pagado';
  return 'parcial';
}

export function importePendiente(precioTotal, pagos) {
  if (precioTotal == null) return null;
  const pendiente = precioTotal - totalPagado(pagos);
  return pendiente > 0 ? Math.round(pendiente * 100) / 100 : 0;
}

// --- Disponibilidad y conflictos -----------------------------------------

function intervalo(r) {
  return [toComparable(r.startDate, r.startTime), toComparable(r.endDate, r.endTime)];
}

// Dos intervalos [inicio, fin) se solapan si uno empieza antes de que el
// otro termine, en ambos sentidos.
export function seSolapan(a, b) {
  const [aIni, aFin] = intervalo(a);
  const [bIni, bFin] = intervalo(b);
  return aIni < bFin && bIni < aFin;
}

// candidata: { startDate, startTime, endDate, endTime }
// reservas: lista completa de reservas (se filtran aquí las confirmadas)
// excluirId: id de la propia reserva al editar, para no compararla consigo misma
export function detectarConflictos(candidata, reservas, excluirId) {
  const conflictos = [];
  for (const r of reservas || []) {
    if (r.status !== 'confirmada') continue;
    if (excluirId && r.id === excluirId) continue;
    if (r.startDate === candidata.startDate) {
      conflictos.push({ tipo: 'misma_fecha_inicio', reserva: r });
      continue;
    }
    if (seSolapan(candidata, r)) {
      conflictos.push({ tipo: 'solape', reserva: r });
    }
  }
  return conflictos;
}

export function fechaBloqueada(bloqueos, fecha) {
  return (bloqueos || []).some((b) => b.date === fecha);
}

// Comprobación completa antes de CONFIRMAR una reserva:
// aforo, mínimo, horario autorizado, fecha bloqueada y conflictos con otras
// reservas confirmadas. Devuelve un array de mensajes de error (vacío si todo ok).
export function validarParaConfirmar(candidata, { reservas, bloqueos }) {
  const errores = [];

  const errAforo = validarAforo(candidata.attendees);
  if (errAforo) errores.push(errAforo);

  const errMin = validarMinimo(candidata.modality, candidata.attendees);
  if (errMin) errores.push(errMin);

  if (candidata.startDate && candidata.endDate && candidata.endTime) {
    if (!dentroDelLimite(candidata.startDate, candidata.endDate, candidata.endTime, !!candidata.isHolidayEve)) {
      const limite = limiteMaximoCierre(candidata.startDate, !!candidata.isHolidayEve);
      errores.push(`El horario supera el límite autorizado (hasta las ${limite.endTime} de la madrugada siguiente).`);
    }
  }

  if (fechaBloqueada(bloqueos, candidata.startDate)) {
    errores.push('Esa fecha está bloqueada y no se puede confirmar.');
  }

  const conflictos = detectarConflictos(candidata, reservas, candidata.id);
  if (conflictos.length > 0) {
    errores.push('La fecha choca con otra reserva ya confirmada.');
  }

  return errores;
}
