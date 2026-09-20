// panel/js/demo-seed.js
//
// Datos ficticios para la maqueta. Nombres, teléfonos y notas inventados:
// no corresponden a clientes reales. Las fechas se generan relativas al
// día en que se abre el panel, para que la agenda y el calendario siempre
// muestren algo relevante sin tener que tocar el código.

function pad2(n) {
  return String(n).padStart(2, '0');
}
function fmt(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function addDays(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}
function nowISO() {
  return new Date().toISOString();
}

export function crearDatosDemo() {
  const hoy = new Date();
  const t = nowISO();

  const reservas = [
    // Confirmada, próxima, Espicha, con señal pagada (pago parcial)
    {
      id: 'r_demo_01',
      clientName: 'Cliente de prueba — Laura (demo)',
      clientPhone: '600 000 001',
      modality: 'espicha',
      attendees: 24,
      startDate: fmt(addDays(hoy, 4)),
      startTime: '21:00',
      endDate: fmt(addDays(hoy, 5)),
      endTime: '03:00',
      isHolidayEve: false,
      totalPrice: 24 * 28,
      depositRequested: 200,
      payments: [
        { id: 'p_demo_01', amount: 200, date: fmt(addDays(hoy, -3)), method: 'transferencia', note: 'Señal' },
      ],
      notes: 'Cumpleaños de grupo. Piden mesa cerca del escenario del karaoke.',
      status: 'confirmada',
      createdAt: t,
      updatedAt: t,
    },
    // Confirmada, fin de semana, Exclusiva, pagada por completo
    {
      id: 'r_demo_02',
      clientName: 'Grupo de prueba — Empresa Norte (demo)',
      clientPhone: '600 000 002',
      modality: 'exclusiva',
      attendees: 45,
      startDate: fmt(nextWeekday(hoy, 6)), // próximo sábado
      startTime: '22:00',
      endDate: fmt(addDays(nextWeekday(hoy, 6), 1)),
      endTime: '05:00',
      isHolidayEve: false,
      totalPrice: 500,
      depositRequested: 150,
      payments: [
        { id: 'p_demo_02a', amount: 150, date: fmt(addDays(hoy, -10)), method: 'transferencia', note: 'Señal' },
        { id: 'p_demo_02b', amount: 350, date: fmt(addDays(hoy, -1)), method: 'efectivo', note: 'Resto, pagado en mano' },
      ],
      notes: 'Cena de empresa. Traen su propio catering y DJ.',
      status: 'confirmada',
      createdAt: t,
      updatedAt: t,
    },
    // Pendiente de confirmación, Híbrida, sin pagos
    {
      id: 'r_demo_03',
      clientName: 'Cliente de prueba — Marcos (demo)',
      clientPhone: '600 000 003',
      modality: 'hibrida',
      attendees: 28,
      startDate: fmt(addDays(hoy, 9)),
      startTime: '20:30',
      endDate: fmt(addDays(hoy, 10)),
      endTime: '02:30',
      isHolidayEve: false,
      totalPrice: 200,
      depositRequested: 100,
      payments: [],
      notes: 'Está esperando confirmación de asistentes antes de cerrar la fecha.',
      status: 'pendiente',
      createdAt: t,
      updatedAt: t,
    },
    // Dos CONSULTAS para la misma fecha (no bloquean disponibilidad entre sí)
    {
      id: 'r_demo_04',
      clientName: 'Cliente de prueba — Sara (demo)',
      clientPhone: '600 000 004',
      modality: 'espicha',
      attendees: 22,
      startDate: fmt(addDays(hoy, 15)),
      startTime: '21:00',
      endDate: fmt(addDays(hoy, 16)),
      endTime: '03:00',
      isHolidayEve: false,
      totalPrice: null,
      depositRequested: null,
      payments: [],
      notes: 'Primera consulta por WhatsApp, todavía sin confirmar nada.',
      status: 'consulta',
      createdAt: t,
      updatedAt: t,
    },
    {
      id: 'r_demo_05',
      clientName: 'Cliente de prueba — David (demo)',
      clientPhone: '600 000 005',
      modality: 'exclusiva',
      attendees: 35,
      startDate: fmt(addDays(hoy, 15)), // misma fecha que r_demo_04, a propósito
      startTime: '22:00',
      endDate: fmt(addDays(hoy, 16)),
      endTime: '05:00',
      isHolidayEve: false,
      totalPrice: null,
      depositRequested: null,
      payments: [],
      notes: 'También pregunta por esa misma fecha. Pendiente de ver quién confirma antes.',
      status: 'consulta',
      createdAt: t,
      updatedAt: t,
    },
    // Evento a medida, con fin ajustado manualmente
    {
      id: 'r_demo_06',
      clientName: 'Cliente de prueba — Asociación Vecinal (demo)',
      clientPhone: '600 000 006',
      modality: 'medida',
      attendees: 40,
      startDate: fmt(addDays(hoy, 20)),
      startTime: '19:00',
      endDate: fmt(addDays(hoy, 20)),
      endTime: '23:30',
      isHolidayEve: false,
      totalPrice: 350,
      depositRequested: 100,
      payments: [],
      notes: 'Presentación de un proyecto vecinal entre semana, sin barra libre.',
      status: 'pendiente',
      createdAt: t,
      updatedAt: t,
    },
    // Cancelada, CONSERVANDO su historial de pagos (no se borra ni se asume devolución)
    {
      id: 'r_demo_07',
      clientName: 'Cliente de prueba — Irene (demo)',
      clientPhone: '600 000 007',
      modality: 'espicha',
      attendees: 20,
      startDate: fmt(addDays(hoy, 7)),
      startTime: '21:00',
      endDate: fmt(addDays(hoy, 8)),
      endTime: '03:00',
      isHolidayEve: false,
      totalPrice: 560,
      depositRequested: 200,
      payments: [
        { id: 'p_demo_07', amount: 200, date: fmt(addDays(hoy, -15)), method: 'transferencia', note: 'Señal (evento cancelado después)' },
      ],
      notes: 'La clienta canceló por un cambio de planes. Señal sin gestionar todavía.',
      status: 'cancelada',
      createdAt: t,
      updatedAt: t,
    },
    // Evento ya pasado (para probar que la agenda distingue próximos de históricos)
    {
      id: 'r_demo_08',
      clientName: 'Cliente de prueba — Grupo Pasado (demo)',
      clientPhone: '600 000 008',
      modality: 'hibrida',
      attendees: 26,
      startDate: fmt(addDays(hoy, -6)),
      startTime: '21:00',
      endDate: fmt(addDays(hoy, -5)),
      endTime: '03:00',
      isHolidayEve: false,
      totalPrice: 200,
      depositRequested: 100,
      payments: [
        { id: 'p_demo_08a', amount: 100, date: fmt(addDays(hoy, -20)), method: 'transferencia', note: 'Señal' },
        { id: 'p_demo_08b', amount: 100, date: fmt(addDays(hoy, -6)), method: 'efectivo', note: 'Resto el día del evento' },
      ],
      notes: 'Evento ya celebrado, pagado por completo.',
      status: 'confirmada',
      createdAt: t,
      updatedAt: t,
    },
  ];

  const bloqueos = [
    {
      id: 'b_demo_01',
      date: fmt(addDays(hoy, 12)),
      reason: 'Revisión anual del sistema de sonido e iluminación (demo)',
      createdAt: t,
      updatedAt: t,
    },
  ];

  return { reservas, bloqueos };
}

// Próximo día de la semana (0=domingo..6=sábado) a partir de una fecha, sin incluir hoy.
function nextWeekday(base, weekday) {
  const d = new Date(base);
  const diff = (weekday - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}
