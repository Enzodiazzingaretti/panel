import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elegirMiniatura, rutaEdge } from '../lib/miniaturas.mjs';

test('la miniatura manual gana sobre la automatica', () => {
  const archivos = ['kexxy-portfolio-desktop.webp', 'kexxy-portfolio-manual.webp'];
  assert.equal(elegirMiniatura('kexxy-portfolio', archivos), 'kexxy-portfolio-manual.webp');
});

test('usa la automatica de desktop si no hay manual', () => {
  const archivos = ['kexxy-portfolio-desktop.webp'];
  assert.equal(elegirMiniatura('kexxy-portfolio', archivos), 'kexxy-portfolio-desktop.webp');
});

test('devuelve null si no hay ninguna', () => {
  assert.equal(elegirMiniatura('VEIL', ['kexxy-portfolio-desktop.webp']), null);
});

test('no confunde proyectos con nombres parecidos', () => {
  const archivos = ['tamara-portfolio-desktop.webp'];
  assert.equal(elegirMiniatura('portfolio', archivos), null);
});

test('encuentra Edge en esta maquina', () => {
  assert.ok(rutaEdge(), 'Edge deberia estar instalado en Windows 11');
});
