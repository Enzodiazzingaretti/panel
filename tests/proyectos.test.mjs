import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  claveDeCarpeta, configDeCarpeta, carpetaValida, esRepoGit, listarProyectos
} from '../lib/proyectos.mjs';

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

// Arma una carpeta de repos de mentira: `repos` son carpetas con `.git`, `sueltas` no.
function reposDePrueba({ repos = [], sueltas = [], archivos = [] } = {}) {
  const raiz = mkdtempSync(join(tmpdir(), 'panel-repos-'));
  for (const n of repos) mkdirSync(join(raiz, n, '.git'), { recursive: true });
  for (const n of sueltas) mkdirSync(join(raiz, n), { recursive: true });
  for (const n of archivos) writeFileSync(join(raiz, n), 'x');
  return raiz;
}

test('detecta un repo por su carpeta .git', () => {
  const raiz = reposDePrueba({ repos: ['con-git'], sueltas: ['sin-git'] });
  assert.equal(esRepoGit(join(raiz, 'con-git')), true);
  assert.equal(esRepoGit(join(raiz, 'sin-git')), false);
  rmSync(raiz, { recursive: true, force: true });
});

test('un worktree cuenta como repo aunque .git sea un archivo', () => {
  const raiz = reposDePrueba({ sueltas: ['worktree'] });
  writeFileSync(join(raiz, 'worktree', '.git'), 'gitdir: /otro/lado\n');
  assert.equal(esRepoGit(join(raiz, 'worktree')), true);
  rmSync(raiz, { recursive: true, force: true });
});

test('en la notebook ignora las carpetas de Documentos que no son proyectos', () => {
  const raiz = reposDePrueba({
    repos: ['kexxy-portfolio', 'aurora-retreat'],
    sueltas: ['Ableton', 'rekordbox', 'My Pictures', 'Resolume Arena'],
    archivos: ['notas.txt']
  });
  assert.deepEqual(listarProyectos(raiz, config), ['kexxy-portfolio', 'aurora-retreat']);
  rmSync(raiz, { recursive: true, force: true });
});

test('una carpeta declarada en config se muestra aunque no sea repo todavia', () => {
  const raiz = reposDePrueba({ sueltas: ['kexxy-portfolio', 'Ableton'] });
  assert.deepEqual(listarProyectos(raiz, config), ['kexxy-portfolio']);
  rmSync(raiz, { recursive: true, force: true });
});

test('un repo nuevo sin configurar igual aparece', () => {
  const raiz = reposDePrueba({ repos: ['proyecto-nuevo'] });
  assert.deepEqual(listarProyectos(raiz, config), ['proyecto-nuevo']);
  rmSync(raiz, { recursive: true, force: true });
});

// El bug de la notebook: `existsSync` en Windows ignora mayusculas, asi que la clave `VEIL`
// pasaba el filtro aunque la carpeta real sea `veil`, y el proyecto salia dos veces.
test('una carpeta no se duplica cuando la clave de config difiere en mayusculas', () => {
  const raiz = reposDePrueba({ repos: ['veil'] });
  const lista = listarProyectos(raiz, config);
  assert.deepEqual(lista, ['veil']);
  assert.equal(claveDeCarpeta(config, lista[0]), 'VEIL');
  rmSync(raiz, { recursive: true, force: true });
});

test('los proyectos configurados van primero y el resto alfabetico', () => {
  const raiz = reposDePrueba({ repos: ['zzz-nuevo', 'aaa-nuevo', 'Aurora', 'kexxy-portfolio'] });
  assert.deepEqual(
    listarProyectos(raiz, config),
    ['kexxy-portfolio', 'Aurora', 'aaa-nuevo', 'zzz-nuevo']
  );
  rmSync(raiz, { recursive: true, force: true });
});

test('una carpeta de repos que no existe devuelve lista vacia en vez de romper', () => {
  assert.deepEqual(listarProyectos(join(tmpdir(), 'no-existe-panel-xyz'), config), []);
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
