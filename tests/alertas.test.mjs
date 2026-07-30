import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularAlertas } from '../lib/alertas.mjs';

const HOY = new Date('2026-07-30T12:00:00');
const gitLimpio = {
  esRepo: true, rama: 'main', sucios: 0, adelante: 0, atras: 0,
  ultimo: { hash: 'abc1234', mensaje: 'algo', fecha: '2026-07-28' },
  ramasExtra: [], bats: [], residuos: [], remoto: 'https://github.com/x/y'
};

function proyecto(over = {}) {
  return {
    nombre: 'kexxy-portfolio',
    git: { ...gitLimpio, ...(over.git ?? {}) },
    ficha: over.ficha === undefined ? { actualizado: '2026-07-28' } : over.ficha,
    config: over.config ?? { ficha: 'kexxy-portfolio', prod: 'https://x.vercel.app' }
  };
}

const sinExtras = { sesionesSinDestilar: 0 };

test('sin problemas no hay alertas', () => {
  assert.deepEqual(calcularAlertas([proyecto()], sinExtras, HOY), []);
});

test('avisa commits sin traer con severidad alta', () => {
  const a = calcularAlertas([proyecto({ git: { atras: 8 } })], sinExtras, HOY);
  const aviso = a.find(x => /sin traer/.test(x.texto));
  assert.equal(aviso.severidad, 'alta');
  assert.match(aviso.texto, /8 commits sin traer/);
});

test('avisa cuando la ficha esta mas vieja que el codigo', () => {
  const a = calcularAlertas(
    [proyecto({ ficha: { actualizado: '2026-07-21' } })], sinExtras, HOY
  );
  const aviso = a.find(x => /ficha/.test(x.texto));
  assert.equal(aviso.severidad, 'alta');
  assert.match(aviso.texto, /7 dias atras del codigo/);
});

test('no avisa deriva de ficha si es de un solo dia', () => {
  const a = calcularAlertas(
    [proyecto({ ficha: { actualizado: '2026-07-27' }, git: { ultimo: { ...gitLimpio.ultimo, fecha: '2026-07-28' } } })],
    sinExtras, HOY
  );
  assert.equal(a.filter(x => /ficha esta/.test(x.texto)).length, 0);
});

test('avisa proyecto sin ficha en la boveda', () => {
  const a = calcularAlertas(
    [proyecto({ ficha: null, config: { ficha: null, prod: null } })], sinExtras, HOY
  );
  const aviso = a.find(x => /sin ficha/.test(x.texto));
  assert.equal(aviso.severidad, 'media');
});

test('avisa ramas sobrantes ademas de main', () => {
  const a = calcularAlertas([proyecto({ git: { ramasExtra: ['feat/algo'] } })], sinExtras, HOY);
  const aviso = a.find(x => /rama/.test(x.texto));
  assert.equal(aviso.severidad, 'media');
  assert.match(aviso.texto, /feat\/algo/);
});

test('avisa commits sin pushear y cambios sin commitear', () => {
  const a = calcularAlertas([proyecto({ git: { adelante: 2, sucios: 3 } })], sinExtras, HOY);
  assert.equal(a.find(x => /sin pushear/.test(x.texto)).severidad, 'media');
  assert.equal(a.find(x => /sin commitear/.test(x.texto)).severidad, 'baja');
});

test('avisa rama que no es main', () => {
  const a = calcularAlertas([proyecto({ git: { rama: 'feat/otra' } })], sinExtras, HOY);
  assert.ok(a.some(x => /no esta en main/.test(x.texto)));
});

test('avisa residuos de deploy que no son Vercel', () => {
  const a = calcularAlertas(
    [proyecto({ git: { residuos: ['netlify.toml', 'gh-pages'] } })], sinExtras, HOY
  );
  const aviso = a.find(x => /netlify\.toml/.test(x.texto));
  assert.equal(aviso.severidad, 'media');
  assert.match(aviso.texto, /gh-pages/);
});

test('avisa sesiones sin destilar en el inbox', () => {
  const a = calcularAlertas([proyecto()], { sesionesSinDestilar: 3 }, HOY);
  const aviso = a.find(x => /sesiones/.test(x.texto));
  assert.equal(aviso.severidad, 'baja');
  assert.match(aviso.texto, /3 sesiones/);
});

test('ordena las alertas por severidad', () => {
  const a = calcularAlertas(
    [proyecto({ git: { sucios: 1, atras: 4, ramasExtra: ['x'] } })], sinExtras, HOY
  );
  assert.deepEqual(a.map(x => x.severidad), ['alta', 'media', 'baja']);
});
