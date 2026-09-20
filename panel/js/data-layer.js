// panel/js/data-layer.js
//
// Capa de acceso a datos del panel. Es el ÚNICO sitio del proyecto que habla
// con Supabase. Toda la interfaz pública sigue siendo asíncrona (Promesas),
// exactamente igual que en la fase de maqueta con localStorage — por eso el
// cambio a datos reales no ha necesitado tocar ni una pantalla de app.js:
// solo se ha reescrito el interior de este archivo.
//
// Los permisos de verdad los pone RLS en la base de datos (ver
// panel/supabase-setup.sql): sin sesión iniciada, estas consultas no
// devuelven nada. Aquí no se reimplementa ninguna comprobación de negocio
// (aforo, mínimos, horarios, conflictos...) — eso sigue viviendo, sin
// cambios, en business-rules.js.

import { supabase } from './supabase-client.js';

// --- Conversión entre las columnas de Supabase (snake_case) y los objetos
// que usa el resto del panel (camelCase, igual que en la fase de maqueta) ---

function pagoFromRow(row) {
  return {
    id: row.id,
    amount: Number(row.amount),
    date: row.date,
    method: row.method,
    note: row.note || '',
  };
}

function reservaFromRow(row, pagos) {
  return {
    id: row.id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    modality: row.modality,
    attendees: row.attendees,
    startDate: row.start_date,
    startTime: (row.start_time || '').slice(0, 5),
    endDate: row.end_date,
    endTime: (row.end_time || '').slice(0, 5),
    isHolidayEve: !!row.is_holiday_eve,
    totalPrice: row.total_price == null ? null : Number(row.total_price),
    depositRequested: row.deposit_requested == null ? null : Number(row.deposit_requested),
    notes: row.notes || '',
    status: row.status,
    payments: (pagos || []).map(pagoFromRow),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Solo incluye en la fila a escribir los campos que realmente vienen en
// `datos`, para que actualizar() pueda hacer cambios parciales sin pisar el
// resto de columnas con `undefined`.
function reservaToRow(datos) {
  const row = {};
  const mapa = {
    clientName: 'client_name', clientPhone: 'client_phone', modality: 'modality',
    attendees: 'attendees', startDate: 'start_date', startTime: 'start_time',
    endDate: 'end_date', endTime: 'end_time', isHolidayEve: 'is_holiday_eve',
    totalPrice: 'total_price', depositRequested: 'deposit_requested',
    notes: 'notes', status: 'status',
  };
  for (const [clave, columna] of Object.entries(mapa)) {
    if (clave in datos) row[columna] = datos[clave];
  }
  return row;
}

function bloqueoFromRow(row) {
  return {
    id: row.id,
    date: row.date,
    reason: row.reason || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function lanzarSiError(error, contexto) {
  if (error) throw new Error(`${contexto}: ${error.message}`);
}

async function pagosDeReserva(id) {
  const { data, error } = await supabase.from('pagos').select('*').eq('reserva_id', id);
  lanzarSiError(error, 'No se pudieron cargar los pagos');
  return data || [];
}

export const ReservasRepo = {
  async listar() {
    const { data: reservas, error } = await supabase
      .from('reservas')
      .select('*')
      .order('start_date', { ascending: true })
      .order('start_time', { ascending: true });
    lanzarSiError(error, 'No se pudieron cargar las reservas');

    const { data: pagos, error: errorPagos } = await supabase.from('pagos').select('*');
    lanzarSiError(errorPagos, 'No se pudieron cargar los pagos');

    const pagosPorReserva = {};
    for (const p of pagos || []) (pagosPorReserva[p.reserva_id] ||= []).push(p);
    return (reservas || []).map((r) => reservaFromRow(r, pagosPorReserva[r.id]));
  },

  async obtener(id) {
    const { data: row, error } = await supabase.from('reservas').select('*').eq('id', id).maybeSingle();
    lanzarSiError(error, 'No se pudo cargar la reserva');
    if (!row) return null;
    const pagos = await pagosDeReserva(id);
    return reservaFromRow(row, pagos);
  },

  async crear(datos) {
    const conDefectos = {
      status: 'consulta', isHolidayEve: false, totalPrice: null,
      depositRequested: null, notes: '', ...datos,
    };
    const { data, error } = await supabase.from('reservas').insert(reservaToRow(conDefectos)).select().single();
    lanzarSiError(error, 'No se pudo crear la reserva');
    return reservaFromRow(data, []);
  },

  async actualizar(id, cambios) {
    const row = reservaToRow(cambios);
    row.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('reservas').update(row).eq('id', id).select().single();
    lanzarSiError(error, 'No se pudo actualizar la reserva');
    const pagos = await pagosDeReserva(id);
    return reservaFromRow(data, pagos);
  },

  async añadirPago(id, pago) {
    const { error } = await supabase.from('pagos').insert({
      reserva_id: id,
      amount: pago.amount,
      date: pago.date,
      method: pago.method,
      note: pago.note || '',
    });
    lanzarSiError(error, 'No se pudo registrar el pago');
    return this.obtener(id);
  },

  async eliminarPago(id, pagoId) {
    const { error } = await supabase.from('pagos').delete().eq('id', pagoId);
    lanzarSiError(error, 'No se pudo quitar el pago');
    return this.obtener(id);
  },

  async confirmadas() {
    const { data, error } = await supabase.from('reservas').select('*').eq('status', 'confirmada');
    lanzarSiError(error, 'No se pudieron cargar las reservas confirmadas');
    return (data || []).map((r) => reservaFromRow(r, []));
  },
};

export const BloqueosRepo = {
  async listar() {
    const { data, error } = await supabase.from('bloqueos').select('*').order('date', { ascending: true });
    lanzarSiError(error, 'No se pudieron cargar los bloqueos');
    return (data || []).map(bloqueoFromRow);
  },

  async crear(datos) {
    const { data, error } = await supabase
      .from('bloqueos')
      .insert({ date: datos.date, reason: datos.reason || '' })
      .select()
      .single();
    lanzarSiError(error, 'No se pudo bloquear la fecha');
    return bloqueoFromRow(data);
  },

  async eliminar(id) {
    const { error } = await supabase.from('bloqueos').delete().eq('id', id);
    lanzarSiError(error, 'No se pudo desbloquear la fecha');
  },

  async estaBloqueada(fecha) {
    const { data, error } = await supabase.from('bloqueos').select('id').eq('date', fecha).maybeSingle();
    lanzarSiError(error, 'No se pudo comprobar el bloqueo');
    return !!data;
  },
};

// ---------------------------------------------------------------------------
// PREPARACIÓN PARA EL FUTURO CALENDARIO PÚBLICO (sección 9 del encargo
// original). Sigue SIN usarse en ninguna pantalla ni enlazada desde la web
// pública: existe solo para demostrar la separación. Deriva de los mismos
// datos SOLO fecha + disponibilidad, sin nombres, teléfonos, modalidad,
// precios, pagos, notas ni motivos de bloqueo.
//
// Importante para cuando se implemente de verdad: esta función hoy se
// ejecuta en el navegador del propio panel (autenticado). Si algún día un
// visitante de la web pública ha de ver disponibilidad, este cálculo (o su
// equivalente) debe correr en el servidor — vía una función de Supabase
// expuesta con permisos de solo lectura para el rol "anon" y RLS que
// permita leer nada más que fecha/disponibilidad — nunca dando a la web
// pública una clave capaz de leer la tabla `reservas` completa.
// ---------------------------------------------------------------------------
export async function calcularDisponibilidadPublica(fechas) {
  const [confirmadas, bloqueos] = await Promise.all([ReservasRepo.confirmadas(), BloqueosRepo.listar()]);
  const fechasOcupadas = new Set(confirmadas.map((r) => r.startDate));
  const fechasBloqueadas = new Set(bloqueos.map((b) => b.date));
  return fechas.map((date) => ({
    date,
    available: !fechasOcupadas.has(date) && !fechasBloqueadas.has(date),
  }));
}
