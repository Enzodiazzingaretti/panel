import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armarComando, ACCIONES } from '../lib/acciones.mjs';

const ctx = {
  nombre: 'kexxy-portfolio',
  rutaRepo: 'D:\\Disco D\\GitHubRepos\\kexxy-portfolio',
  prod: 'https://portfolio-kexxy.vercel.app',
  remoto: 'https://github.com/enzodiazzingaretti27-design/portfolio',
  fichaRuta: '10-proyectos/kexxy-portfolio/kexxy-portfolio.md',
  bats: ['Indexar-Proyecto.bat'],
  scriptDev: 'dev'
};

test('vscode abre el editor en la ruta del repo', () => {
  const c = armarComando('vscode', ctx);
  assert.equal(c.cwd, ctx.rutaRepo);
  assert.ok(c.args.includes(ctx.rutaRepo));
});

test('claude abre una terminal en el repo', () => {
  const c = armarComando('claude', ctx);
  assert.equal(c.cwd, ctx.rutaRepo);
  assert.ok(c.args.join(' ').includes('claude'));
});

test('dev usa el script de dev del package.json', () => {
  const c = armarComando('dev', ctx);
  assert.ok(c.args.join(' ').includes('run dev'));
});

test('prod y github abren la url correspondiente', () => {
  assert.ok(armarComando('prod', ctx).args.includes(ctx.prod));
  assert.ok(armarComando('github', ctx).args.includes(ctx.remoto));
});

test('ficha abre el enlace obsidian con la vault y el archivo', () => {
  const c = armarComando('ficha', ctx);
  const url = c.args.find(a => a.startsWith('obsidian://'));
  assert.match(url, /vault=boveda/);
  assert.match(url, /kexxy-portfolio\.md/);
});

test('una accion desconocida es rechazada', () => {
  assert.throws(() => armarComando('rm-rf', ctx), /Accion no permitida/);
});

test('un bat que no esta en la lista del repo es rechazado', () => {
  assert.throws(
    () => armarComando('bat', { ...ctx, bat: 'Otro.bat' }),
    /no existe en el repo/
  );
});

test('prod sin url configurada es rechazado', () => {
  assert.throws(() => armarComando('prod', { ...ctx, prod: null }), /sin URL de produccion/);
});

test('la lista de acciones es cerrada', () => {
  assert.deepEqual(ACCIONES, ['claude', 'vscode', 'dev', 'prod', 'github', 'ficha', 'bat']);
});
