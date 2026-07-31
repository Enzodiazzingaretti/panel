import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Lectura de las notas de finanzas de la boveda. **Solo lectura**, como todo el panel:
// escribir es la Fase 2 y tiene su propio contrato.
//
// La fuente son tablas de markdown escritas a mano, asi que el parseo tiene que ser
// tolerante: los montos vienen "17.715,82", "~30.200" o "s/d", los vencimientos "21/07",
// "17", "~Día 26" o "Mensual (~10)", y el estado es un emoji con texto al lado.

const NOTAS = [
  { archivo: '30-notas/finanzas-responsabilidades-mensuales.md', origen: 'responsabilidades' },
  { archivo: '30-notas/finanzas-suscripciones.md', origen: 'suscripciones' }
];

// Las tablas de resumen repiten conceptos que ya estan en las de detalle. Se saltean
// para no contar dos veces: en las notas de hoy, "Suscripciones (detalle en archivo
// aparte)" y "Resumen" duplican lo de finanzas-suscripciones.
const SECCIONES_IGNORADAS = /resumen|detalle en archivo aparte/i;

export function parsearMonto(texto) {
  if (!texto) return null;
  const limpio = String(texto).replace(/[~\s]/g, '');
  if (!/\d/.test(limpio)) return null; // "s/d", "—", vacio

  // formato local: punto de miles, coma decimal
  const n = Number(limpio.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Devuelve el dia del mes, que es lo unico comparable entre "21/07", "17" y "~Día 26".
export function parsearDia(texto) {
  if (!texto) return null;
  const t = String(texto);

  const fecha = t.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (fecha) return Number(fecha[1]);

  const dia = t.match(/(\d{1,2})/);
  return dia ? Number(dia[1]) : null;
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

// Las cuotas de tarjeta traen el mes por nombre ("Agosto") en vez de un dia. Sin esto,
// una cuota de septiembre se cuenta como deuda de hoy y el total del mes miente por arriba.
export function parsearMes(texto) {
  if (!texto) return null;
  const t = String(texto).toLowerCase();
  const i = MESES.findIndex(m => t.includes(m));
  return i >= 0 ? i + 1 : null;
}

export function parsearEstado(texto) {
  const t = String(texto ?? '');
  if (/✅|pagado/i.test(t)) return 'pagado';
  if (/⚠️|pendiente/i.test(t)) return 'pendiente';
  if (/❓|revisar|sin registrar/i.test(t)) return 'revisar';
  return 'desconocido';
}

function celdas(linea) {
  return linea.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

function esSeparador(linea) {
  return /^\|[\s:-]+\|/.test(linea.trim());
}

// Recorre la nota guardando el ultimo encabezado visto, para saber de que seccion sale
// cada fila y poder descartar las tablas de resumen.
export function parsearNota(texto, origen) {
  const items = [];
  let seccion = '';
  let cabecera = null;

  for (const linea of String(texto).split(/\r?\n/)) {
    const enc = linea.match(/^#{2,4}\s+(.*)$/);
    if (enc) { seccion = enc[1].replace(/[#*`]/g, '').trim(); cabecera = null; continue; }

    if (!linea.trim().startsWith('|')) { cabecera = null; continue; }
    if (esSeparador(linea)) continue;

    const cols = celdas(linea);
    if (!cabecera) { cabecera = cols.map(c => c.toLowerCase()); continue; }
    if (SECCIONES_IGNORADAS.test(seccion)) continue;

    const buscar = (...claves) => {
      for (const clave of claves) {
        const i = cabecera.findIndex(c => c.includes(clave));
        if (i >= 0 && cols[i] !== undefined) return cols[i];
      }
      return '';
    };

    let concepto = (buscar('concepto', 'nombre', 'cuota') || '').replace(/\*\*/g, '').trim();
    if (!concepto) continue;

    const estado = parsearEstado(buscar('estado'));
    if (estado === 'desconocido') continue; // no es una fila de gasto

    // Una tabla de cuotas tiene "1/3" por concepto, que solo no dice nada. El nombre
    // real esta en el encabezado de la seccion.
    if (/^\d+\s*\/\s*\d+$/.test(concepto)) {
      const dueno = seccion.replace(/^.*—\s*/, '').trim() || seccion;
      concepto = `${dueno} — cuota ${concepto}`;
    }

    const montoArs = buscar('monto ars', 'costo ars', 'monto');
    items.push({
      concepto,
      seccion,
      mes: parsearMes(buscar('mes')),
      origen,
      monto: parsearMonto(montoArs),
      montoTexto: (montoArs || 's/d').replace(/\*\*/g, ''),
      montoUsd: parsearMonto(buscar('costo usd')),
      dia: parsearDia(buscar('vencimiento', 'renovación', 'renovacion', 'día', 'dia', 'mes')),
      vencimientoTexto: (buscar('vencimiento', 'renovación', 'renovacion', 'día', 'dia', 'mes') || '—'),
      estado,
      notas: buscar('notas')
    });
  }

  return items;
}

export function leerFinanzas(rutaBoveda, hoy = new Date()) {
  const items = [];
  const faltan = [];

  for (const { archivo, origen } of NOTAS) {
    const ruta = join(rutaBoveda, ...archivo.split('/'));
    if (!existsSync(ruta)) { faltan.push(archivo); continue; }
    try {
      items.push(...parsearNota(readFileSync(ruta, 'utf8'), origen));
    } catch {
      faltan.push(archivo);
    }
  }

  return resumir(items, faltan, hoy);
}

export function resumir(items, faltan = [], hoy = new Date()) {
  const diaHoy = hoy.getDate();
  const mesHoy = hoy.getMonth() + 1;

  for (const it of items) {
    it.futuro = it.estado === 'pendiente' && it.mes !== null && it.mes > mesHoy;
    it.vencido = it.estado === 'pendiente' && !it.futuro && it.dia !== null && it.dia < diaHoy;
    it.diasDeAtraso = it.vencido ? diaHoy - it.dia : 0;
  }

  const pendientes = items.filter(i => i.estado === 'pendiente' && !i.futuro);
  const proximos = items.filter(i => i.futuro);
  const vencidos = pendientes.filter(i => i.vencido);
  const sumar = (lista) => lista.reduce((t, i) => t + (i.monto ?? 0), 0);

  // Un pendiente sin monto no se puede sumar, pero tampoco se puede ignorar: si no se
  // dice, el total miente por abajo y parece que debes menos de lo que debes.
  const sinMonto = pendientes.filter(i => i.monto === null).map(i => i.concepto);

  const orden = { pendiente: 0, revisar: 1, pagado: 2 };
  items.sort((a, b) =>
    Number(a.futuro) - Number(b.futuro) ||
    (orden[a.estado] ?? 3) - (orden[b.estado] ?? 3) ||
    (a.dia ?? 99) - (b.dia ?? 99) ||
    a.concepto.localeCompare(b.concepto)
  );

  return {
    items,
    // El mensual no cuenta lo de meses siguientes: es lo que se paga en un mes tipico.
    totalMensual: sumar(items.filter(i => !i.futuro)),
    pendientes: pendientes.length,
    totalPendiente: sumar(pendientes),
    vencidos: vencidos.map(i => i.concepto),
    totalVencido: sumar(vencidos),
    proximos: proximos.map(i => i.concepto),
    totalProximos: sumar(proximos),
    sinMonto,
    aRevisar: items.filter(i => i.estado === 'revisar').map(i => i.concepto),
    faltan,
    dia: diaHoy
  };
}
