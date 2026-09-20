// panel/js/business-rules.test.js
//
// Pruebas de las reglas de negocio, ejecutables directamente con Node
// (no hace falta ningún framework de test ni instalar nada):
//
//   node panel/js/business-rules.test.js
//
// Cubre los escenarios pedidos en la especificación: cálculo de fin por
// modalidad, límites horarios entre semana / fin de semana / víspera de
// festivo, eventos que cruzan la medianoche, aforo y mínimos, pagos
// parciales, y conflictos de disponibilidad (misma fecha de inicio,
// solape de intervalos, edición sin auto-conflicto, bloqueos).

import assert from 'node:assert/strict';
import * as BR from './business-rules.js';

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log('  ✓', name);
  } catch (err) {
    fail++;
    console.error('  ✗', name);
    console.error('    ', err.message);
  }
}

console.log('\nReglas de negocio — Capua 6 panel\n');

// --- Fin por defecto según modalidad -------------------------------------

test('Espicha: 6 horas desde las 21:00 termina a las 03:00 del día siguiente', () => {
  const fin = BR.calcularFinPorDefecto('espicha', '2026-10-10', '21:00');
  assert.equal(fin.endDate, '2026-10-11');
  assert.equal(fin.endTime, '03:00');
});

test('Híbrida: 6 horas desde las 22:30 termina a las 04:30 del día siguiente', () => {
  const fin = BR.calcularFinPorDefecto('hibrida', '2026-10-10', '22:30');
  assert.equal(fin.endDate, '2026-10-11');
  assert.equal(fin.endTime, '04:30');
});

test('Exclusiva: 7 horas desde las 22:00 termina a las 05:00 del día siguiente', () => {
  const fin = BR.calcularFinPorDefecto('exclusiva', '2026-10-10', '22:00');
  assert.equal(fin.endDate, '2026-10-11');
  assert.equal(fin.endTime, '05:00');
});

test('Evento a medida no tiene fin por defecto (hay que introducirlo a mano)', () => {
  const fin = BR.calcularFinPorDefecto('medida', '2026-10-10', '20:00');
  assert.equal(fin, null);
});

// --- Un evento que empieza el viernes y acaba el sábado de madrugada ------

test('Evento viernes 23:00 -> sábado 05:00: "pertenece" al viernes (fecha de inicio)', () => {
  // 2026-10-16 es viernes
  const fin = BR.sumarHoras('2026-10-16', '23:00', 6);
  assert.equal(fin.endDate, '2026-10-17'); // sábado de madrugada
  assert.equal(BR.diaDeReserva('2026-10-16'), '2026-10-16'); // sigue siendo el viernes
});

// --- Límites horarios: entre semana / fin de semana / víspera de festivo --

test('Límite entre semana (domingo a jueves) es 03:30 del día siguiente', () => {
  // 2026-10-14 es miércoles
  const limite = BR.limiteMaximoCierre('2026-10-14', false);
  assert.equal(limite.endTime, '03:30');
  assert.equal(limite.endDate, '2026-10-15');
});

test('Límite en viernes es 05:30 del día siguiente', () => {
  const limite = BR.limiteMaximoCierre('2026-10-16', false); // viernes
  assert.equal(limite.endTime, '05:30');
});

test('Límite en sábado es 05:30 del día siguiente', () => {
  const limite = BR.limiteMaximoCierre('2026-10-17', false); // sábado
  assert.equal(limite.endTime, '05:30');
});

test('Un miércoles marcado como víspera de festivo usa el límite de 05:30', () => {
  const limite = BR.limiteMaximoCierre('2026-10-14', true); // miércoles + víspera
  assert.equal(limite.endTime, '05:30');
});

test('dentroDelLimite: 03:15 un jueves entra dentro del límite (03:30)', () => {
  assert.equal(BR.dentroDelLimite('2026-10-15', '2026-10-16', '03:15', false), true);
});

test('dentroDelLimite: 03:45 un jueves SUPERA el límite (03:30)', () => {
  assert.equal(BR.dentroDelLimite('2026-10-15', '2026-10-16', '03:45', false), false);
});

test('dentroDelLimite: 05:15 un viernes entra dentro del límite (05:30)', () => {
  assert.equal(BR.dentroDelLimite('2026-10-16', '2026-10-17', '05:15', false), true);
});

// --- Precio de referencia de la Espicha (por persona) ----------------------

test('Precio de referencia de la Espicha con 24 personas = 24 x 28 €', () => {
  assert.equal(BR.precioReferencia('espicha', 24), 672);
});

test('Precio de referencia de la Híbrida es fijo (200 €), no depende de asistentes', () => {
  assert.equal(BR.precioReferencia('hibrida', 45), 200);
});

test('La modalidad "medida" no tiene precio de referencia (null)', () => {
  assert.equal(BR.precioReferencia('medida', 30), null);
});

// --- Aforo y mínimos --------------------------------------------------------

test('Aforo máximo: 50 personas es válido, 51 no', () => {
  assert.equal(BR.validarAforo(50), null);
  assert.match(BR.validarAforo(51), /aforo máximo/i);
});

test('Espicha con 19 personas incumple el mínimo (20)', () => {
  assert.match(BR.validarMinimo('espicha', 19), /mínimo de 20/);
});

test('Híbrida con 20 personas SÍ cumple el mínimo actualizado (20)', () => {
  assert.equal(BR.validarMinimo('hibrida', 20), null);
});

test('Exclusiva no tiene mínimo comercial: 5 personas es válido', () => {
  assert.equal(BR.validarMinimo('exclusiva', 5), null);
});

// --- Pagos parciales y saldo pendiente --------------------------------------

test('Sin pagos registrados: estado "sin_pagos" y pendiente = precio total', () => {
  assert.equal(BR.estadoPago(500, []), 'sin_pagos');
  assert.equal(BR.importePendiente(500, []), 500);
});

test('Pago parcial: 200 de 500 -> estado "parcial", pendiente 300', () => {
  const pagos = [{ amount: 200, date: '2026-10-01', method: 'transferencia' }];
  assert.equal(BR.estadoPago(500, pagos), 'parcial');
  assert.equal(BR.importePendiente(500, pagos), 300);
});

test('Pago completo (o superior): estado "pagado", pendiente 0', () => {
  const pagos = [
    { amount: 200, date: '2026-10-01', method: 'transferencia' },
    { amount: 300, date: '2026-10-10', method: 'efectivo' },
  ];
  assert.equal(BR.estadoPago(500, pagos), 'pagado');
  assert.equal(BR.importePendiente(500, pagos), 0);
});

test('Sin precio acordado todavía: estado "sin_precio"', () => {
  assert.equal(BR.estadoPago(null, []), 'sin_precio');
});

// --- Conflictos de disponibilidad -------------------------------------------

const reservaBase = {
  id: 'r1',
  status: 'confirmada',
  startDate: '2026-11-07', // sábado
  startTime: '22:00',
  endDate: '2026-11-08',
  endTime: '05:00',
};

test('Dos reservas confirmadas con la misma fecha de inicio: conflicto', () => {
  const candidata = { startDate: '2026-11-07', startTime: '20:00', endDate: '2026-11-08', endTime: '02:00' };
  const conflictos = BR.detectarConflictos(candidata, [reservaBase]);
  assert.equal(conflictos.length, 1);
  assert.equal(conflictos[0].tipo, 'misma_fecha_inicio');
});

test('Dos reservas que empiezan en fechas distintas pero cuyos horarios se solapan: conflicto', () => {
  // reservaBase: sábado 22:00 -> domingo 05:00
  // candidata: empieza el domingo a las 02:00 (dentro del intervalo anterior)
  const candidata = { startDate: '2026-11-08', startTime: '02:00', endDate: '2026-11-08', endTime: '08:00' };
  const conflictos = BR.detectarConflictos(candidata, [reservaBase]);
  assert.equal(conflictos.length, 1);
  assert.equal(conflictos[0].tipo, 'solape');
});

test('Reservas consecutivas sin solape (una termina justo cuando empieza la otra): sin conflicto', () => {
  const candidata = { startDate: '2026-11-08', startTime: '05:00', endDate: '2026-11-08', endTime: '10:00' };
  const conflictos = BR.detectarConflictos(candidata, [reservaBase]);
  assert.equal(conflictos.length, 0);
});

test('Al editar una reserva, se excluye a sí misma de la comprobación de conflictos', () => {
  const candidata = { id: 'r1', startDate: '2026-11-07', startTime: '23:00', endDate: '2026-11-08', endTime: '05:30' };
  const conflictos = BR.detectarConflictos(candidata, [reservaBase], 'r1');
  assert.equal(conflictos.length, 0);
});

test('Las consultas y pendientes NO bloquean disponibilidad (no generan conflicto)', () => {
  const pendiente = { ...reservaBase, id: 'r2', status: 'pendiente' };
  const candidata = { startDate: '2026-11-07', startTime: '20:00', endDate: '2026-11-08', endTime: '02:00' };
  const conflictos = BR.detectarConflictos(candidata, [pendiente]);
  assert.equal(conflictos.length, 0);
});

test('Rechaza confirmar dos reservas para la misma fecha (validarParaConfirmar)', () => {
  const candidata = {
    modality: 'exclusiva', attendees: 30,
    startDate: '2026-11-07', startTime: '20:00', endDate: '2026-11-08', endTime: '02:00',
  };
  const errores = BR.validarParaConfirmar(candidata, { reservas: [reservaBase], bloqueos: [] });
  assert.ok(errores.some((e) => /choca con otra reserva/.test(e)));
});

test('No permite confirmar en una fecha bloqueada', () => {
  const candidata = {
    modality: 'exclusiva', attendees: 30,
    startDate: '2026-12-01', startTime: '20:00', endDate: '2026-12-02', endTime: '02:00',
  };
  const bloqueos = [{ date: '2026-12-01', reason: 'Reforma' }];
  const errores = BR.validarParaConfirmar(candidata, { reservas: [], bloqueos });
  assert.ok(errores.some((e) => /bloqueada/.test(e)));
});

test('Bloquear y desbloquear una fecha cambia si aparece como bloqueada', () => {
  const bloqueos = [{ date: '2026-12-05', reason: 'Prueba' }];
  assert.equal(BR.fechaBloqueada(bloqueos, '2026-12-05'), true);
  const sinBloqueo = bloqueos.filter((b) => b.date !== '2026-12-05');
  assert.equal(BR.fechaBloqueada(sinBloqueo, '2026-12-05'), false);
});

test('validarParaConfirmar acumula varios errores a la vez (aforo + horario)', () => {
  const candidata = {
    modality: 'espicha', attendees: 60, // supera aforo
    startDate: '2026-10-14', startTime: '20:00', // miércoles
    endDate: '2026-10-15', endTime: '04:00', // supera el límite de 03:30
  };
  const errores = BR.validarParaConfirmar(candidata, { reservas: [], bloqueos: [] });
  assert.ok(errores.some((e) => /aforo máximo/i.test(e)));
  assert.ok(errores.some((e) => /límite autorizado/i.test(e)));
});

// --- Campos obligatorios -----------------------------------------------------

test('Detecta campos obligatorios ausentes', () => {
  const errores = BR.validarCamposObligatorios({});
  assert.ok(errores.length >= 5);
});

test('No hay errores de campos obligatorios cuando todo está informado', () => {
  const errores = BR.validarCamposObligatorios({
    clientName: 'Ana', clientPhone: '600111222', modality: 'espicha',
    startDate: '2026-10-10', startTime: '21:00', endDate: '2026-10-11', endTime: '03:00',
  });
  assert.equal(errores.length, 0);
});

console.log(`\n${pass} pasadas, ${fail} fallidas\n`);
process.exit(fail ? 1 : 0);
