import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsearMonto, parsearDia, parsearMes, parsearEstado, parsearNota, resumir } from '../lib/finanzas.mjs';

test('los montos vienen en formato local, con o sin aproximacion', () => {
  assert.equal(parsearMonto('17.715,82'), 17715.82);
  assert.equal(parsearMonto('~30.200'), 30200);
  assert.equal(parsearMonto('7.000'), 7000);
  assert.equal(parsearMonto('40.000'), 40000);
});

test('un monto que no esta cargado da null, no cero', () => {
  // Cero mentiria: cero es "no cuesta nada", null es "no sabemos cuanto".
  for (const vacio of ['s/d', '—', '', null, undefined, 'Confirmar monto']) {
    assert.equal(parsearMonto(vacio), null, `deberia ser null: ${vacio}`);
  }
});

test('el dia sale igual de una fecha o de un numero suelto', () => {
  assert.equal(parsearDia('21/07'), 21);
  assert.equal(parsearDia('17'), 17);
  assert.equal(parsearDia('~Día 26'), 26);
  assert.equal(parsearDia('Día 16'), 16);
  assert.equal(parsearDia('Mensual (~10)'), 10);
  assert.equal(parsearDia('—'), null);
});

test('los meses por nombre se reconocen', () => {
  assert.equal(parsearMes('Agosto'), 8);
  assert.equal(parsearMes('septiembre'), 9);
  assert.equal(parsearMes('Julio'), 7);
  assert.equal(parsearMes('17'), null);
});

test('el estado se lee del emoji o del texto', () => {
  assert.equal(parsearEstado('✅ Pagado'), 'pagado');
  assert.equal(parsearEstado('⚠️ Pendiente'), 'pendiente');
  assert.equal(parsearEstado('❓ Revisar'), 'revisar');
  assert.equal(parsearEstado('❓ Sin registrar'), 'revisar');
  assert.equal(parsearEstado('Notas sueltas'), 'desconocido');
});

const NOTA = `---
titulo: X
---

## 🔌 Servicios

| Concepto | Monto ARS | Vencimiento | Estado | Notas |
|----------|-----------|------------|--------|-------|
| Luz (EDEMSA) | s/d | 21/07 | ⚠️ Pendiente | NIC 2566114 |
| Gas (Ecogas) | 17.715,82 | 27/07 | ⚠️ Pendiente | Cuenta 20018112 |
| Claro (celular) | 21.738,98 | 22/07 | ✅ Pagado | Naranja X |

## 💳 Obligaciones Financieras — Tarjeta Naranja X

| Cuota | Monto ARS | Mes | Estado |
|-------|-----------|-----|--------|
| 1/3 | 40.000 | Julio | ✅ Pagado |
| 2/3 | 40.000 | Agosto | ⚠️ Pendiente |

## 📊 Resumen

| Concepto | Monto ARS | Día | Estado |
|----------|-----------|-----|--------|
| Gas (Ecogas) | 17.715,82 | 27 | ⚠️ Pendiente |
`;

test('parsea las filas de las tablas de gasto', () => {
  const items = parsearNota(NOTA, 'test');
  const nombres = items.map(i => i.concepto);
  assert.ok(nombres.includes('Luz (EDEMSA)'));
  assert.ok(nombres.includes('Gas (Ecogas)'));
  assert.ok(nombres.includes('Claro (celular)'));
});

// Las notas repiten los mismos conceptos en tablas de resumen. Sin saltearlas, Gas se
// contaria dos veces y el total del mes saldria inflado.
test('las tablas de resumen no se cuentan dos veces', () => {
  const items = parsearNota(NOTA, 'test');
  assert.equal(items.filter(i => i.concepto === 'Gas (Ecogas)').length, 1);
});

test('una cuota "2/3" toma el nombre de su seccion', () => {
  const items = parsearNota(NOTA, 'test');
  const cuota = items.find(i => i.concepto.includes('2/3'));
  assert.equal(cuota.concepto, 'Tarjeta Naranja X — cuota 2/3');
  assert.equal(cuota.mes, 8);
});

test('lo vencido se calcula contra el dia de hoy', () => {
  const r = resumir(parsearNota(NOTA, 'test'), [], new Date('2026-07-31T12:00:00'));
  assert.deepEqual(r.vencidos.sort(), ['Gas (Ecogas)', 'Luz (EDEMSA)']);
  assert.equal(Math.round(r.totalVencido), 17716);
  assert.equal(r.items.find(i => i.concepto === 'Luz (EDEMSA)').diasDeAtraso, 10);
});

test('a mitad de mes lo que todavia no vence no figura como vencido', () => {
  const r = resumir(parsearNota(NOTA, 'test'), [], new Date('2026-07-22T12:00:00'));
  assert.deepEqual(r.vencidos, ['Luz (EDEMSA)']);
  assert.equal(r.pendientes, 2, 'Gas sigue pendiente pero no vencido');
});

// Una cuota de agosto no es deuda de julio: contarla infla el mes.
test('las cuotas de meses siguientes van aparte del pendiente del mes', () => {
  const r = resumir(parsearNota(NOTA, 'test'), [], new Date('2026-07-31T12:00:00'));
  assert.deepEqual(r.proximos, ['Tarjeta Naranja X — cuota 2/3']);
  assert.equal(r.totalProximos, 40000);
  assert.ok(!r.vencidos.includes('Tarjeta Naranja X — cuota 2/3'));
  assert.equal(Math.round(r.totalPendiente), 17716, 'la cuota de agosto no suma al mes');
});

test('los pendientes sin monto se cuentan aparte para que el total no mienta', () => {
  const r = resumir(parsearNota(NOTA, 'test'), [], new Date('2026-07-31T12:00:00'));
  assert.deepEqual(r.sinMonto, ['Luz (EDEMSA)']);
  assert.equal(r.pendientes, 2);
});

test('sin notas de finanzas devuelve vacio en vez de romper', () => {
  const r = resumir([], ['30-notas/finanzas-suscripciones.md'], new Date('2026-07-31'));
  assert.deepEqual(r.items, []);
  assert.equal(r.totalMensual, 0);
  assert.equal(r.pendientes, 0);
  assert.deepEqual(r.faltan, ['30-notas/finanzas-suscripciones.md']);
});
