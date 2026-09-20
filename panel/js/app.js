// panel/js/app.js
//
// UI y estado del panel. Renderizado con plantillas de texto (innerHTML),
// sin frameworks: para el tamaño de esta maqueta es más que suficiente y
// evita añadir una dependencia grande solo para pintar unas pocas pantallas.
//
// Estructura del archivo:
//   1. Estado y arranque
//   2. Utilidades de formato
//   3. Vista: Agenda
//   4. Vista: Calendario
//   5. Vista: Bloqueos
//   6. Modal: crear/editar reserva
//   7. Modal: ficha de reserva (detalle + pagos)
//   8. Modal: bloquear fecha
//   9. Acciones (confirmar, cancelar, pagos, bloqueos, reset demo)

import * as BR from './business-rules.js';
import { ReservasRepo, BloqueosRepo, resetearDatosDemo } from './data-layer.js';

// === 1. ESTADO Y ARRANQUE ===================================================

const state = {
  tab: 'agenda', // 'agenda' | 'calendario' | 'bloqueos'
  reservas: [],
  bloqueos: [],
  filtroAgenda: 'todas', // 'todas' | 'consulta' | 'pendiente' | 'confirmada' | 'cancelada'
  calMes: new Date().getMonth(),
  calAnio: new Date().getFullYear(),
  diaSeleccionado: null, // 'YYYY-MM-DD' en la vista de calendario
};

async function cargarDatos() {
  state.reservas = await ReservasRepo.listar();
  state.bloqueos = await BloqueosRepo.listar();
}

async function refrescar() {
  await cargarDatos();
  renderTab();
}

function $(sel, root = document) {
  return root.querySelector(sel);
}
function $$(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function iconos() {
  if (window.lucide) window.lucide.createIcons();
}

async function iniciar() {
  await cargarDatos();
  wireTabs();
  wireResetDemo();
  wireNuevaReserva();
  renderTab();
}

document.addEventListener('DOMContentLoaded', iniciar);

function wireTabs() {
  $$('.panel-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      $$('.panel-tab').forEach((b) => b.classList.toggle('is-active', b === btn));
      renderTab();
    });
  });
}

function wireNuevaReserva() {
  $('#btn-nueva-reserva')?.addEventListener('click', () => abrirFormularioReserva());
}

function wireResetDemo() {
  $('#btn-reset-demo')?.addEventListener('click', async () => {
    if (!confirm('Esto borra los cambios que hayas hecho en esta maqueta y vuelve a cargar los datos ficticios de partida. ¿Continuar?')) return;
    await resetearDatosDemo();
    await refrescar();
  });
}

function renderTab() {
  const root = $('#tab-content');
  if (!root) return;
  if (state.tab === 'agenda') renderAgenda(root);
  else if (state.tab === 'calendario') renderCalendario(root);
  else if (state.tab === 'bloqueos') renderBloqueos(root);
  iconos();
}

// === 2. UTILIDADES DE FORMATO ===============================================

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function fechaCorta(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DIAS_CORTOS[dt.getDay()]} ${d} ${MESES[m - 1].slice(0, 3)}`;
}

function fechaLarga(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DIAS_CORTOS[dt.getDay()]}, ${d} de ${MESES[m - 1]} de ${y}`;
}

function dinero(n) {
  if (n == null) return '—';
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const ESTADO_RESERVA = {
  consulta: { label: 'Consulta', clase: 'badge-slate' },
  pendiente: { label: 'Pendiente', clase: 'badge-amber' },
  confirmada: { label: 'Confirmada', clase: 'badge-emerald' },
  cancelada: { label: 'Cancelada', clase: 'badge-rose' },
};

const ESTADO_PAGO = {
  sin_precio: { label: 'Precio pendiente', clase: 'badge-slate' },
  sin_pagos: { label: 'Sin pagos', clase: 'badge-slate-outline' },
  parcial: { label: 'Pago parcial', clase: 'badge-amber' },
  pagado: { label: 'Pagado', clase: 'badge-emerald' },
};

function badgeReserva(status) {
  const e = ESTADO_RESERVA[status] || ESTADO_RESERVA.consulta;
  return `<span class="badge ${e.clase}">${e.label}</span>`;
}

function badgePago(precioTotal, pagos) {
  const estado = BR.estadoPago(precioTotal, pagos);
  const e = ESTADO_PAGO[estado];
  return `<span class="badge ${e.clase}">${e.label}</span>`;
}

function modalidadLabel(key) {
  return BR.getModalidad(key)?.label || key;
}

function reservasOrdenadas() {
  return [...state.reservas].sort((a, b) => BR.toComparable(a.startDate, a.startTime).localeCompare(BR.toComparable(b.startDate, b.startTime)));
}

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// === 3. VISTA: AGENDA ========================================================

function renderAgenda(root) {
  const hoy = hoyISO();
  const filtro = state.filtroAgenda;
  let lista = reservasOrdenadas();
  if (filtro !== 'todas') lista = lista.filter((r) => r.status === filtro);

  const proximas = lista.filter((r) => r.startDate >= hoy);
  const pasadas = lista.filter((r) => r.startDate < hoy).reverse();

  const filtros = ['todas', 'consulta', 'pendiente', 'confirmada', 'cancelada'];
  const filtrosHtml = filtros
    .map((f) => {
      const label = f === 'todas' ? 'Todas' : ESTADO_RESERVA[f].label;
      return `<button class="chip-filtro ${f === filtro ? 'is-active' : ''}" data-filtro="${f}">${label}</button>`;
    })
    .join('');

  root.innerHTML = `
    <div class="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4">${filtrosHtml}</div>
    <h2 class="panel-h2">Próximos eventos</h2>
    <div class="space-y-2 mb-6">${proximas.length ? proximas.map(tarjetaAgenda).join('') : vacioHtml('No hay eventos próximos con este filtro.')}</div>
    ${pasadas.length ? `
      <h2 class="panel-h2">Eventos pasados</h2>
      <div class="space-y-2 opacity-70">${pasadas.slice(0, 15).map(tarjetaAgenda).join('')}</div>
    ` : ''}
  `;

  $$('.chip-filtro', root).forEach((btn) => {
    btn.addEventListener('click', () => {
      state.filtroAgenda = btn.dataset.filtro;
      renderAgenda(root);
      iconos();
    });
  });
  $$('.tarjeta-reserva', root).forEach((el) => {
    el.addEventListener('click', () => abrirFichaReserva(el.dataset.id));
  });
}

function vacioHtml(msg) {
  return `<p class="text-sm text-neutral-500 py-6 text-center">${esc(msg)}</p>`;
}

function tarjetaAgenda(r) {
  const pagoEstado = BR.estadoPago(r.totalPrice, r.payments);
  return `
    <button type="button" class="tarjeta-reserva" data-id="${r.id}">
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <div class="text-xs uppercase tracking-wide text-neutral-500">${fechaCorta(r.startDate)} · ${r.startTime}</div>
          <div class="font-semibold text-neutral-100 truncate">${esc(r.clientName)}</div>
          <div class="text-xs text-neutral-400">${modalidadLabel(r.modality)} · ${r.attendees} personas</div>
        </div>
        <div class="flex flex-col items-end gap-1 shrink-0">
          ${badgeReserva(r.status)}
          ${r.status !== 'cancelada' ? badgePago(r.totalPrice, r.payments) : ''}
        </div>
      </div>
    </button>
  `;
}

// === 4. VISTA: CALENDARIO =====================================================

function renderCalendario(root) {
  const { calMes, calAnio } = state;
  const primerDiaMes = new Date(calAnio, calMes, 1);
  const diasEnMes = new Date(calAnio, calMes + 1, 0).getDate();
  // La cabecera del calendario reutiliza DIAS_CORTOS, que está indexado como
  // getDay() (domingo = 0): el desfase de celdas vacías debe usar el mismo
  // orden, o los días quedan corridos una columna respecto a su nombre real.
  const offset = primerDiaMes.getDay();

  const porFecha = {};
  for (const r of state.reservas) {
    if (r.status === 'cancelada') continue;
    (porFecha[r.startDate] ||= []).push(r);
  }
  const bloqueadas = new Set(state.bloqueos.map((b) => b.date));

  let celdas = '';
  for (let i = 0; i < offset; i++) celdas += `<div class="cal-celda cal-vacia"></div>`;
  for (let dia = 1; dia <= diasEnMes; dia++) {
    const iso = `${calAnio}-${String(calMes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const items = porFecha[iso] || [];
    const confirmadas = items.filter((r) => r.status === 'confirmada').length;
    const otras = items.length - confirmadas;
    const bloqueada = bloqueadas.has(iso);
    const esHoy = iso === hoyISO();
    celdas += `
      <button type="button" class="cal-celda ${esHoy ? 'cal-hoy' : ''} ${state.diaSeleccionado === iso ? 'cal-seleccionada' : ''}" data-fecha="${iso}">
        <span class="cal-num">${dia}</span>
        <span class="cal-marcas">
          ${bloqueada ? '<span class="cal-punto cal-punto-bloqueo" title="Bloqueada"></span>' : ''}
          ${confirmadas ? `<span class="cal-punto cal-punto-confirmada" title="Confirmada"></span>` : ''}
          ${otras ? `<span class="cal-punto cal-punto-pendiente" title="Consulta / pendiente"></span>` : ''}
        </span>
      </button>
    `;
  }

  root.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <button type="button" id="cal-prev" class="panel-btn-icon" aria-label="Mes anterior"><i data-lucide="chevron-left"></i></button>
      <h2 class="panel-h2 !my-0">${MESES[calMes]} ${calAnio}</h2>
      <button type="button" id="cal-next" class="panel-btn-icon" aria-label="Mes siguiente"><i data-lucide="chevron-right"></i></button>
    </div>
    <div class="cal-grid-cabecera">${DIAS_CORTOS.map((d) => `<span>${d}</span>`).join('')}</div>
    <div class="cal-grid">${celdas}</div>
    <div class="flex flex-wrap gap-3 text-xs text-neutral-400 mt-3">
      <span class="flex items-center gap-1.5"><span class="cal-punto cal-punto-confirmada"></span> Confirmada</span>
      <span class="flex items-center gap-1.5"><span class="cal-punto cal-punto-pendiente"></span> Consulta / pendiente</span>
      <span class="flex items-center gap-1.5"><span class="cal-punto cal-punto-bloqueo"></span> Bloqueada</span>
    </div>
    <div id="cal-detalle-dia" class="mt-5"></div>
  `;

  $('#cal-prev', root).addEventListener('click', () => cambiarMes(-1));
  $('#cal-next', root).addEventListener('click', () => cambiarMes(1));
  $$('.cal-celda:not(.cal-vacia)', root).forEach((btn) => {
    btn.addEventListener('click', () => {
      state.diaSeleccionado = btn.dataset.fecha;
      renderCalendario(root);
      iconos();
      $('#cal-detalle-dia', root)?.scrollIntoView({ block: 'nearest' });
    });
  });

  if (state.diaSeleccionado) {
    renderDetalleDia($('#cal-detalle-dia', root), state.diaSeleccionado, porFecha[state.diaSeleccionado] || [], bloqueadas.has(state.diaSeleccionado));
  }
}

function cambiarMes(delta) {
  state.calMes += delta;
  if (state.calMes < 0) { state.calMes = 11; state.calAnio -= 1; }
  if (state.calMes > 11) { state.calMes = 0; state.calAnio += 1; }
  renderTab();
}

function renderDetalleDia(root, fecha, items, bloqueada) {
  if (!root) return;
  root.innerHTML = `
    <div class="panel-card">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-neutral-100">${fechaLarga(fecha)}</h3>
        ${bloqueada ? '<span class="badge badge-rose">Bloqueada</span>' : ''}
      </div>
      <div class="space-y-2 mb-4">
        ${items.length ? items.map(tarjetaAgenda).join('') : vacioHtml('Sin consultas ni reservas ese día.')}
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" id="btn-dia-nueva" class="panel-btn panel-btn-primary">Añadir reserva</button>
        ${bloqueada
          ? `<button type="button" id="btn-dia-desbloquear" class="panel-btn panel-btn-outline">Desbloquear fecha</button>`
          : `<button type="button" id="btn-dia-bloquear" class="panel-btn panel-btn-outline">Bloquear fecha</button>`}
      </div>
    </div>
  `;
  $$('.tarjeta-reserva', root).forEach((el) => el.addEventListener('click', () => abrirFichaReserva(el.dataset.id)));
  $('#btn-dia-nueva', root)?.addEventListener('click', () => abrirFormularioReserva(null, fecha));
  $('#btn-dia-bloquear', root)?.addEventListener('click', () => abrirFormularioBloqueo(fecha));
  $('#btn-dia-desbloquear', root)?.addEventListener('click', async () => {
    const b = state.bloqueos.find((x) => x.date === fecha);
    if (b) await BloqueosRepo.eliminar(b.id);
    await refrescar();
  });
}

// === 5. VISTA: BLOQUEOS =======================================================

function renderBloqueos(root) {
  const lista = [...state.bloqueos].sort((a, b) => a.date.localeCompare(b.date));
  root.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h2 class="panel-h2 !my-0">Fechas bloqueadas</h2>
      <button type="button" id="btn-nuevo-bloqueo" class="panel-btn panel-btn-primary">Bloquear fecha</button>
    </div>
    <p class="text-xs text-neutral-500 mb-4">El motivo es una nota interna: nunca se mostrará en la web pública.</p>
    <div class="space-y-2">
      ${lista.length ? lista.map((b) => `
        <div class="panel-card flex items-center justify-between gap-3">
          <div>
            <div class="font-semibold text-neutral-100">${fechaLarga(b.date)}</div>
            <div class="text-sm text-neutral-400">${esc(b.reason || 'Sin motivo indicado')}</div>
          </div>
          <button type="button" class="panel-btn panel-btn-outline shrink-0" data-desbloquear="${b.id}">Desbloquear</button>
        </div>
      `).join('') : vacioHtml('No hay fechas bloqueadas.')}
    </div>
  `;
  $('#btn-nuevo-bloqueo', root).addEventListener('click', () => abrirFormularioBloqueo());
  $$('[data-desbloquear]', root).forEach((btn) => {
    btn.addEventListener('click', async () => {
      await BloqueosRepo.eliminar(btn.dataset.desbloquear);
      await refrescar();
    });
  });
}

// === 6. MODAL: CREAR / EDITAR RESERVA ========================================

function abrirModal(html) {
  const root = $('#modal-root');
  $('#modal-content').innerHTML = html;
  root.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  iconos();
  $('#modal-close')?.addEventListener('click', cerrarModal);
  root.onclick = (e) => { if (e.target === root) cerrarModal(); };
}

function cerrarModal() {
  const root = $('#modal-root');
  root.classList.add('hidden');
  $('#modal-content').innerHTML = '';
  document.body.style.overflow = '';
}

function abrirFormularioReserva(id = null, fechaPrefijada = null) {
  const existente = id ? state.reservas.find((r) => r.id === id) : null;
  const r = existente || {
    clientName: '', clientPhone: '', modality: 'espicha', attendees: '',
    startDate: fechaPrefijada || hoyISO(), startTime: '21:00',
    endDate: '', endTime: '', isHolidayEve: false,
    totalPrice: '', depositRequested: '', notes: '', status: 'consulta',
  };

  const opcionesModalidad = BR.listaModalidades().map((m) => `<option value="${m.key}" ${r.modality === m.key ? 'selected' : ''}>${m.label}</option>`).join('');
  const opcionesEstado = Object.entries(ESTADO_RESERVA).map(([k, v]) => `<option value="${k}" ${r.status === k ? 'selected' : ''}>${v.label}</option>`).join('');

  abrirModal(`
    <form id="form-reserva" class="panel-form" novalidate>
      <div class="panel-modal-header">
        <h3>${existente ? 'Editar reserva' : 'Nueva consulta / reserva'}</h3>
        <button type="button" id="modal-close" class="panel-btn-icon" aria-label="Cerrar"><i data-lucide="x"></i></button>
      </div>
      <div id="form-errores" class="panel-errores hidden"></div>

      <label class="panel-label">Nombre del cliente
        <input required name="clientName" class="panel-input" value="${esc(r.clientName)}" placeholder="Ej. Ana García">
      </label>
      <label class="panel-label">Teléfono
        <input required name="clientPhone" class="panel-input" value="${esc(r.clientPhone)}" placeholder="Ej. 600 000 000">
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="panel-label">Modalidad
          <select name="modality" class="panel-input">${opcionesModalidad}</select>
        </label>
        <label class="panel-label">Nº asistentes
          <input required type="number" min="1" max="${BR.AFORO_MAXIMO}" name="attendees" class="panel-input" value="${esc(r.attendees)}">
        </label>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <label class="panel-label">Fecha de inicio
          <input required type="date" name="startDate" class="panel-input" value="${esc(r.startDate)}">
        </label>
        <label class="panel-label">Hora de inicio
          <input required type="time" name="startTime" class="panel-input" value="${esc(r.startTime)}">
        </label>
      </div>

      <label class="panel-check">
        <input type="checkbox" name="isHolidayEve" ${r.isHolidayEve ? 'checked' : ''}>
        Víspera de festivo (aplica el límite de las 05:30)
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="panel-label">Fecha de fin
          <input required type="date" name="endDate" class="panel-input" value="${esc(r.endDate)}">
        </label>
        <label class="panel-label">Hora de fin
          <input required type="time" name="endTime" class="panel-input" value="${esc(r.endTime)}">
        </label>
      </div>
      <p class="text-xs text-neutral-500 -mt-2">Se calcula sola con la modalidad y la hora de inicio; en "Evento a medida" se introduce a mano. Siempre se puede ajustar.</p>

      <label class="panel-label">Precio total acordado (€)
        <input type="number" min="0" step="1" name="totalPrice" class="panel-input" value="${esc(r.totalPrice)}" placeholder="Se sugiere solo si aún no hay precio guardado">
      </label>
      <label class="panel-label">Señal solicitada (€)
        <input type="number" min="0" step="1" name="depositRequested" class="panel-input" value="${esc(r.depositRequested)}">
      </label>

      <label class="panel-label">Estado de la reserva
        <select name="status" class="panel-input">${opcionesEstado}</select>
      </label>

      <label class="panel-label">Notas para organizar el evento
        <textarea name="notes" class="panel-input" rows="3">${esc(r.notes)}</textarea>
      </label>

      <div class="panel-modal-footer">
        <button type="button" id="modal-cancel" class="panel-btn panel-btn-outline">Cancelar</button>
        <button type="submit" class="panel-btn panel-btn-primary">${existente ? 'Guardar cambios' : 'Crear'}</button>
      </div>
    </form>
  `);

  const form = $('#form-reserva');
  const precioTocado = { valor: !!(existente && existente.totalPrice != null) };

  function recalcularFin() {
    const modality = form.modality.value;
    const startDate = form.startDate.value;
    const startTime = form.startTime.value;
    if (!startDate || !startTime) return;
    const fin = BR.calcularFinPorDefecto(modality, startDate, startTime);
    if (fin) {
      form.endDate.value = fin.endDate;
      form.endTime.value = fin.endTime;
    }
  }

  function sugerirPrecio() {
    if (precioTocado.valor) return; // no pisar un precio ya acordado / editado a mano
    const sugerido = BR.precioReferencia(form.modality.value, Number(form.attendees.value));
    if (sugerido != null) form.totalPrice.value = sugerido;
  }

  if (!existente) {
    recalcularFin();
    sugerirPrecio();
  }

  form.modality.addEventListener('change', () => { recalcularFin(); sugerirPrecio(); });
  form.attendees.addEventListener('input', sugerirPrecio);
  form.startDate.addEventListener('change', recalcularFin);
  form.startTime.addEventListener('change', recalcularFin);
  form.totalPrice.addEventListener('input', () => { precioTocado.valor = true; });

  $('#modal-cancel').addEventListener('click', cerrarModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = {
      clientName: form.clientName.value.trim(),
      clientPhone: form.clientPhone.value.trim(),
      modality: form.modality.value,
      attendees: Number(form.attendees.value),
      startDate: form.startDate.value,
      startTime: form.startTime.value,
      isHolidayEve: form.isHolidayEve.checked,
      endDate: form.endDate.value,
      endTime: form.endTime.value,
      totalPrice: form.totalPrice.value === '' ? null : Number(form.totalPrice.value),
      depositRequested: form.depositRequested.value === '' ? null : Number(form.depositRequested.value),
      status: form.status.value,
      notes: form.notes.value.trim(),
    };

    const errores = [...BR.validarCamposObligatorios(datos)];
    const errAforo = BR.validarAforo(datos.attendees);
    if (errAforo) errores.push(errAforo);
    const errMin = BR.validarMinimo(datos.modality, datos.attendees);
    if (errMin) errores.push(errMin);
    if (datos.startDate && datos.endDate && datos.endTime) {
      if (!BR.dentroDelLimite(datos.startDate, datos.endDate, datos.endTime, datos.isHolidayEve)) {
        const lim = BR.limiteMaximoCierre(datos.startDate, datos.isHolidayEve);
        errores.push(`El horario supera el límite autorizado para esa fecha (hasta las ${lim.endTime} de la madrugada siguiente).`);
      }
    }
    if (datos.status === 'confirmada') {
      const errosConfirmar = BR.validarParaConfirmar(
        { ...datos, id: existente?.id },
        { reservas: state.reservas, bloqueos: state.bloqueos },
      );
      // Evitar duplicar mensajes ya comprobados arriba (aforo/mínimo/horario)
      for (const msg of errosConfirmar) if (!errores.includes(msg)) errores.push(msg);
    }

    if (errores.length) {
      mostrarErroresForm(errores);
      return;
    }

    if (existente) {
      await ReservasRepo.actualizar(existente.id, datos);
    } else {
      await ReservasRepo.crear(datos);
    }
    cerrarModal();
    await refrescar();
  });
}

function mostrarErroresForm(errores) {
  const box = $('#form-errores');
  if (!box) return;
  box.innerHTML = errores.map((e) => `<div>• ${esc(e)}</div>`).join('');
  box.classList.remove('hidden');
  // El aviso va justo debajo de la cabecera: basta con subir el modal del todo
  // para que se vea completo (scrollIntoView deja el borde superior cortado).
  const modalRoot = $('#modal-root');
  if (modalRoot) modalRoot.scrollTop = 0;
}

// === 7. MODAL: FICHA DE RESERVA (detalle + pagos) ============================

function abrirFichaReserva(id) {
  const r = state.reservas.find((x) => x.id === id);
  if (!r) return;

  const pendiente = BR.importePendiente(r.totalPrice, r.payments);
  const pagosHtml = (r.payments || []).length
    ? r.payments.map((p) => `
        <div class="flex items-center justify-between text-sm py-1.5 border-b border-neutral-800 last:border-0">
          <div>
            <span class="font-medium text-neutral-100">${dinero(p.amount)}</span>
            <span class="text-neutral-500"> · ${p.method === 'efectivo' ? 'Efectivo' : 'Transferencia'} · ${p.date}</span>
            ${p.note ? `<div class="text-xs text-neutral-500">${esc(p.note)}</div>` : ''}
          </div>
          <button type="button" class="text-xs text-rose-400 hover:text-rose-300" data-quitar-pago="${p.id}">Quitar</button>
        </div>
      `).join('')
    : `<p class="text-sm text-neutral-500">Sin pagos registrados todavía.</p>`;

  abrirModal(`
    <div class="panel-form">
      <div class="panel-modal-header">
        <h3>Ficha del evento</h3>
        <button type="button" id="modal-close" class="panel-btn-icon" aria-label="Cerrar"><i data-lucide="x"></i></button>
      </div>

      <div class="flex items-center gap-2 flex-wrap mb-1">
        ${badgeReserva(r.status)}
        ${badgePago(r.totalPrice, r.payments)}
      </div>
      <h4 class="text-lg font-semibold text-neutral-100">${esc(r.clientName)}</h4>
      <p class="text-sm text-neutral-400 mb-3">${esc(r.clientPhone)}</p>

      <dl class="panel-dl">
        <dt>Modalidad</dt><dd>${modalidadLabel(r.modality)}</dd>
        <dt>Asistentes</dt><dd>${r.attendees} personas</dd>
        <dt>Inicio</dt><dd>${fechaLarga(r.startDate)} · ${r.startTime}</dd>
        <dt>Fin</dt><dd>${fechaLarga(r.endDate)} · ${r.endTime}</dd>
        <dt>Víspera de festivo</dt><dd>${r.isHolidayEve ? 'Sí' : 'No'}</dd>
        <dt>Precio total</dt><dd>${dinero(r.totalPrice)}</dd>
        <dt>Señal solicitada</dt><dd>${dinero(r.depositRequested)}</dd>
        <dt>Pendiente de cobro</dt><dd>${r.status === 'cancelada' ? '—' : dinero(pendiente)}</dd>
        <dt>Notas</dt><dd>${r.notes ? esc(r.notes) : '—'}</dd>
        <dt>Creada</dt><dd>${new Date(r.createdAt).toLocaleString('es-ES')}</dd>
        <dt>Modificada</dt><dd>${new Date(r.updatedAt).toLocaleString('es-ES')}</dd>
      </dl>

      <h5 class="font-semibold text-neutral-200 mt-4 mb-2">Pagos</h5>
      <div id="lista-pagos">${pagosHtml}</div>

      ${r.status !== 'cancelada' ? `
        <form id="form-pago" class="flex flex-wrap items-end gap-2 mt-3">
          <label class="panel-label !mb-0 flex-1 min-w-[90px]">Importe
            <input required type="number" min="0.01" step="0.01" name="amount" class="panel-input">
          </label>
          <label class="panel-label !mb-0 flex-1 min-w-[90px]">Fecha
            <input required type="date" name="date" class="panel-input" value="${hoyISO()}">
          </label>
          <label class="panel-label !mb-0 flex-1 min-w-[110px]">Método
            <select name="method" class="panel-input">
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </label>
          <button type="submit" class="panel-btn panel-btn-outline whitespace-nowrap">Registrar pago</button>
        </form>
        <p class="text-xs text-neutral-500 mt-1">Registrar un pago es una acción manual, después de comprobarlo tú mismo. No verifica transferencias automáticamente.</p>
      ` : `<p class="text-xs text-neutral-500 mt-2">Reserva cancelada: el historial de pagos se conserva. Cualquier devolución se gestiona aparte, fuera de esta maqueta.</p>`}

      <div id="ficha-errores" class="panel-errores hidden mt-2"></div>

      <div class="panel-modal-footer flex-wrap">
        <button type="button" id="btn-editar" class="panel-btn panel-btn-outline">Editar</button>
        ${r.status === 'pendiente' || r.status === 'consulta' ? `<button type="button" id="btn-confirmar" class="panel-btn panel-btn-primary">Confirmar reserva</button>` : ''}
        ${r.status !== 'cancelada' ? `<button type="button" id="btn-cancelar" class="panel-btn panel-btn-danger">Cancelar reserva</button>` : ''}
      </div>
    </div>
  `);

  $('#btn-editar').addEventListener('click', () => abrirFormularioReserva(r.id));

  $('#btn-confirmar')?.addEventListener('click', async () => {
    const errores = BR.validarParaConfirmar(r, { reservas: state.reservas, bloqueos: state.bloqueos });
    if (errores.length) {
      const box = $('#ficha-errores');
      box.innerHTML = errores.map((e) => `<div>• ${esc(e)}</div>`).join('');
      box.classList.remove('hidden');
      return;
    }
    await ReservasRepo.actualizar(r.id, { status: 'confirmada' });
    cerrarModal();
    await refrescar();
  });

  $('#btn-cancelar')?.addEventListener('click', async () => {
    if (!confirm('¿Cancelar esta reserva? El historial de pagos se conserva y no se registra ninguna devolución automática.')) return;
    await ReservasRepo.actualizar(r.id, { status: 'cancelada' });
    cerrarModal();
    await refrescar();
  });

  $('#form-pago')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    await ReservasRepo.añadirPago(r.id, {
      amount: Number(f.amount.value),
      date: f.date.value,
      method: f.method.value,
      note: '',
    });
    cerrarModal();
    await refrescar();
    abrirFichaReserva(r.id);
  });

  $$('[data-quitar-pago]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await ReservasRepo.eliminarPago(r.id, btn.dataset.quitarPago);
      await refrescar();
      abrirFichaReserva(r.id);
    });
  });
}

// === 8. MODAL: BLOQUEAR FECHA =================================================

function abrirFormularioBloqueo(fechaPrefijada = null) {
  abrirModal(`
    <form id="form-bloqueo" class="panel-form">
      <div class="panel-modal-header">
        <h3>Bloquear fecha</h3>
        <button type="button" id="modal-close" class="panel-btn-icon" aria-label="Cerrar"><i data-lucide="x"></i></button>
      </div>
      <label class="panel-label">Fecha
        <input required type="date" name="date" class="panel-input" value="${fechaPrefijada || hoyISO()}">
      </label>
      <label class="panel-label">Motivo (interno, nunca se muestra en la web pública)
        <textarea name="reason" class="panel-input" rows="2" placeholder="Ej. mantenimiento, cierre por vacaciones, evento privado sin publicar..."></textarea>
      </label>
      <div class="panel-modal-footer">
        <button type="button" id="modal-cancel" class="panel-btn panel-btn-outline">Cancelar</button>
        <button type="submit" class="panel-btn panel-btn-primary">Bloquear</button>
      </div>
    </form>
  `);
  $('#modal-cancel').addEventListener('click', cerrarModal);
  $('#form-bloqueo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    await BloqueosRepo.crear({ date: f.date.value, reason: f.reason.value.trim() });
    cerrarModal();
    await refrescar();
  });
}
