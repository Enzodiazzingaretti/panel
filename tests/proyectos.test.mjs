import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { claveDeCarpeta, configDeCarpeta, carpetaValida } from '../lib/proyectos.mjs';

const config = {
  proyectos: {
    'kexxy-portfolio': { ficha: 'kexxy-portfolio', prod: 'https://x.vercel.app' },
    'Aurora': { ficha: 'aurora-cecilia-hospedajes', prod: null, alias: ['aurora-retreat'] },
    'Aural-studio': { ficha: null, prod: null, alias: ['creative-agency-template'] },
    'sommelier_portfolio': { ficha: null, prod: null, alias: ['sommelier-portfolio'] },
    'VEIL': { ficha: null, prod: null, alias: ['veil'] }
  }
};

test('resuelve una carpeta que se llama igual que la clave', () => {
  assert.equal(claveDeCarpeta(config, 'kexxy-portfolio'), 'kexxy-portfolio');
});

test('resuelve la carpeta de la notebook por alias', () => {
  assert.equal(claveDeCarpeta(config, 'aurora-retreat'), 'Aurora');
  assert.equal(claveDeCarpeta(config, 'creative-agency-template'), 'Aural-studio');
  assert.equal(claveDeCarpeta(config, 'sommelier-portfolio'), 'sommelier_portfolio');
});

test('ignora mayusculas', () => {
  assert.equal(claveDeCarpeta(config, 'veil'), 'VEIL');
  assert.equal(claveDeCarpeta(config, 'AURORA'), 'Aurora');
});

test('la ficha de la notebook es la misma que la de la PC principal', () => {
  const enPrincipal = configDeCarpeta(config, 'Aurora');
  const enNotebook = configDeCarpeta(config, 'aurora-retreat');
  assert.equal(enNotebook.ficha, 'aurora-cecilia-hospedajes');
  assert.equal(enNotebook.ficha, enPrincipal.ficha);
});

test('una carpeta desconocida queda sin configurar en vez de romper', () => {
  const cfg = configDeCarpeta(config, 'proyecto-nuevo');
  assert.equal(cfg.sinConfigurar, true);
  assert.equal(cfg.ficha, null);
  assert.equal(cfg.prod, null);
  assert.equal(claveDeCarpeta(config, 'proyecto-nuevo'), null);
});

test('acepta una carpeta real dentro de la carpeta de repos', () => {
  const repos = mkdtempSync(join(tmpdir(), 'panel-repos-'));
  mkdirSync(join(repos, 'mi-proyecto'));
  assert.equal(carpetaValida(repos, 'mi-proyecto'), true);
  rmSync(repos, { recursive: true, force: true });
});

test('rechaza lo que no es un directorio', () => {
  const repos = mkdtempSync(join(tmpdir(), 'panel-repos-'));
  writeFileSync(join(repos, 'archivo.txt'), 'x');
  assert.equal(carpetaValida(repos, 'archivo.txt'), false);
  assert.equal(carpetaValida(repos, 'no-existe'), false);
  rmSync(repos, { recursive: true, force: true });
});

test('rechaza intentos de salir de la carpeta de repos', () => {
  const repos = mkdtempSync(join(tmpdir(), 'panel-repos-'));
  mkdirSync(join(repos, 'mi-proyecto'));
  for (const malo of ['..', '../..', 'mi-proyecto/../..', 'C:\\Windows', '/etc', 'sub\\dir', '']) {
    assert.equal(carpetaValida(repos, malo), false, `deberia rechazar: ${malo}`);
  }
  rmSync(repos, { recursive: true, force: true });
});

test('rechaza valores que no son texto', () => {
  const repos = mkdtempSync(join(tmpdir(), 'panel-repos-'));
  for (const malo of [null, undefined, 42, {}, []]) {
    assert.equal(carpetaValida(repos, malo), false);
  }
  rmSync(repos, { recursive: true, force: true });
});
