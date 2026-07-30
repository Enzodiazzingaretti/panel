import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { leerRepo } from '../lib/repos.mjs';

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function repoNuevo() {
  const dir = mkdtempSync(join(tmpdir(), 'panel-test-'));
  git(dir, 'init', '-b', 'main');
  git(dir, 'config', 'user.email', 'test@test.com');
  git(dir, 'config', 'user.name', 'Test');
  writeFileSync(join(dir, 'archivo.txt'), 'uno\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', 'primer commit');
  return dir;
}

test('lee rama, ultimo commit y arbol limpio', () => {
  const dir = repoNuevo();
  const r = leerRepo(dir);
  assert.equal(r.rama, 'main');
  assert.equal(r.sucios, 0);
  assert.equal(r.ultimo.mensaje, 'primer commit');
  assert.match(r.ultimo.fecha, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(r.ultimo.hash.length, 7);
  rmSync(dir, { recursive: true, force: true });
});

test('cuenta archivos sin commitear, modificados y sin trackear', () => {
  const dir = repoNuevo();
  writeFileSync(join(dir, 'archivo.txt'), 'dos\n');
  writeFileSync(join(dir, 'nuevo.txt'), 'nuevo\n');
  const r = leerRepo(dir);
  assert.equal(r.sucios, 2);
  rmSync(dir, { recursive: true, force: true });
});

test('detecta ramas locales ademas de main', () => {
  const dir = repoNuevo();
  git(dir, 'branch', 'feat/algo');
  const r = leerRepo(dir);
  assert.deepEqual(r.ramasExtra, ['feat/algo']);
  rmSync(dir, { recursive: true, force: true });
});

test('adelante y atras son null cuando la rama no tiene upstream', () => {
  const dir = repoNuevo();
  const r = leerRepo(dir);
  assert.equal(r.adelante, null);
  assert.equal(r.atras, null);
  rmSync(dir, { recursive: true, force: true });
});

test('cuenta commits adelante del upstream', () => {
  const origen = repoNuevo();
  const clon = mkdtempSync(join(tmpdir(), 'panel-clon-'));
  execFileSync('git', ['clone', origen, clon], { encoding: 'utf8' });
  execFileSync('git', ['config', 'user.email', 't@t.com'], { cwd: clon });
  execFileSync('git', ['config', 'user.name', 'T'], { cwd: clon });
  writeFileSync(join(clon, 'otro.txt'), 'x\n');
  git(clon, 'add', '-A');
  git(clon, 'commit', '-m', 'segundo');
  const r = leerRepo(clon);
  assert.equal(r.adelante, 1);
  assert.equal(r.atras, 0);
  rmSync(origen, { recursive: true, force: true });
  rmSync(clon, { recursive: true, force: true });
});

test('lista los .bat de la raiz', () => {
  const dir = repoNuevo();
  writeFileSync(join(dir, 'Indexar-Proyecto.bat'), 'echo\n');
  writeFileSync(join(dir, 'Ver-Graph.bat'), 'echo\n');
  const r = leerRepo(dir);
  assert.deepEqual(r.bats.sort(), ['Indexar-Proyecto.bat', 'Ver-Graph.bat']);
  rmSync(dir, { recursive: true, force: true });
});

test('una carpeta que no es repo devuelve esRepo false sin tirar error', () => {
  const dir = mkdtempSync(join(tmpdir(), 'panel-norepo-'));
  const r = leerRepo(dir);
  assert.equal(r.esRepo, false);
  rmSync(dir, { recursive: true, force: true });
});

test('detecta netlify.toml como residuo de deploy', () => {
  const dir = repoNuevo();
  writeFileSync(join(dir, 'netlify.toml'), '[build]\n');
  const r = leerRepo(dir);
  assert.ok(r.residuos.includes('netlify.toml'));
  rmSync(dir, { recursive: true, force: true });
});

test('detecta un workflow de gh-pages como residuo', () => {
  const dir = repoNuevo();
  mkdirSync(join(dir, '.github', 'workflows'), { recursive: true });
  writeFileSync(join(dir, '.github/workflows/deploy.yml'), 'uses: actions/deploy-pages@v4\n');
  const r = leerRepo(dir);
  assert.ok(r.residuos.includes('workflow de gh-pages'));
  rmSync(dir, { recursive: true, force: true });
});

test('un repo limpio no tiene residuos', () => {
  const dir = repoNuevo();
  assert.deepEqual(leerRepo(dir).residuos, []);
  rmSync(dir, { recursive: true, force: true });
});
