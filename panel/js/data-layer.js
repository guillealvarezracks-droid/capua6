// panel/js/data-layer.js
//
// Capa de acceso a datos del panel. Es el ÚNICO sitio del proyecto que toca
// localStorage. Toda la interfaz pública es asíncrona (devuelve Promesas)
// aunque hoy esté respaldada por localStorage, precisamente para que el día
// de mañana se pueda sustituir por llamadas a un backend real (Firebase,
// Supabase, una API propia...) SIN cambiar ni una línea de las pantallas:
// solo habría que reescribir el interior de estas funciones.
//
// AVISO IMPORTANTE (léelo también en el propio panel):
// localStorage vive únicamente en este navegador y este dispositivo.
//   - No se sincroniza entre el móvil del dueño y el del padre.
//   - No es un almacén seguro para datos reales de clientes.
//   - No sustituye a la futura base de datos: es solo una maqueta.

import { crearDatosDemo } from './demo-seed.js';

const LS_RESERVAS = 'capua6_panel_demo_reservas_v1';
const LS_BLOQUEOS = 'capua6_panel_demo_bloqueos_v1';

function leer(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function escribir(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function ahora() {
  return new Date().toISOString();
}

function asegurarSemilla() {
  if (localStorage.getItem(LS_RESERVAS) == null) {
    const { reservas, bloqueos } = crearDatosDemo();
    escribir(LS_RESERVAS, reservas);
    escribir(LS_BLOQUEOS, bloqueos);
  }
}

export const ReservasRepo = {
  async listar() {
    asegurarSemilla();
    return leer(LS_RESERVAS, []);
  },

  async obtener(id) {
    const todas = await this.listar();
    return todas.find((r) => r.id === id) || null;
  },

  async crear(datos) {
    const todas = await this.listar();
    const nueva = {
      payments: [],
      status: 'consulta',
      isHolidayEve: false,
      totalPrice: null,
      depositRequested: null,
      notes: '',
      ...datos,
      id: uid('r'),
      createdAt: ahora(),
      updatedAt: ahora(),
    };
    todas.push(nueva);
    escribir(LS_RESERVAS, todas);
    return nueva;
  },

  async actualizar(id, cambios) {
    const todas = await this.listar();
    const idx = todas.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Reserva no encontrada.');
    todas[idx] = { ...todas[idx], ...cambios, id, updatedAt: ahora() };
    escribir(LS_RESERVAS, todas);
    return todas[idx];
  },

  async añadirPago(id, pago) {
    const r = await this.obtener(id);
    if (!r) throw new Error('Reserva no encontrada.');
    const pagos = [...(r.payments || []), { id: uid('p'), ...pago }];
    return this.actualizar(id, { payments: pagos });
  },

  async eliminarPago(id, pagoId) {
    const r = await this.obtener(id);
    if (!r) throw new Error('Reserva no encontrada.');
    const pagos = (r.payments || []).filter((p) => p.id !== pagoId);
    return this.actualizar(id, { payments: pagos });
  },

  async confirmadas() {
    const todas = await this.listar();
    return todas.filter((r) => r.status === 'confirmada');
  },
};

export const BloqueosRepo = {
  async listar() {
    asegurarSemilla();
    return leer(LS_BLOQUEOS, []);
  },

  async crear(datos) {
    const todos = await this.listar();
    const nuevo = { ...datos, id: uid('b'), createdAt: ahora(), updatedAt: ahora() };
    todos.push(nuevo);
    escribir(LS_BLOQUEOS, todos);
    return nuevo;
  },

  async eliminar(id) {
    const todos = await this.listar();
    escribir(LS_BLOQUEOS, todos.filter((b) => b.id !== id));
  },

  async estaBloqueada(fecha) {
    const todos = await this.listar();
    return todos.some((b) => b.date === fecha);
  },
};

export async function resetearDatosDemo() {
  const { reservas, bloqueos } = crearDatosDemo();
  escribir(LS_RESERVAS, reservas);
  escribir(LS_BLOQUEOS, bloqueos);
}

// ---------------------------------------------------------------------------
// PREPARACIÓN PARA EL FUTURO CALENDARIO PÚBLICO (sección 9 del encargo)
//
// Esta función NO se usa todavía en ninguna pantalla ni está enlazada desde
// la web pública. Existe para dejar demostrada la separación desde ahora:
// deriva de los mismos datos SOLO fecha + disponibilidad, sin nombres,
// teléfonos, modalidad, precios, pagos, notas ni motivos de bloqueo.
//
// El día que exista un backend real, este cálculo (o su equivalente) deberá
// ejecutarse en el servidor, y la web pública solo deberá recibir el
// resultado de aquí abajo — nunca la lista completa de reservas.
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
