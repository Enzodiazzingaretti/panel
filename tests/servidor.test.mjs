import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearServidor } from '../server.mjs';

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));

function servidorDePrueba() {
  const config = {
    puerto: 0,
    maquinas: {},
    candidatos: { repos: [], boveda: [] },
    proyectos: {
      'kexxy-portfolio': { ficha: 'kexxy-portfolio', prod: 'https://x.vercel.app' }
    }
  };
  const maquina = { hostname: 'TEST', repos: join(raiz, 'tests'), boveda: join(raiz, 'tests') };
  return crearServidor({ raiz, config, maquina });
}

async function pedir(servidor, ruta) {
  await new Promise(r => servidor.listen(0, '127.0.0.1', r));
  const { port } = servidor.address();
  const res = await fetch(`http://127.0.0.1:${port}${ruta}`);
  const cuerpo = await res.text();
  await new Promise(r => servidor.close(r));
  return { status: res.status, tipo: res.headers.get('content-type'), cuerpo };
}

test('GET /api/estado devuelve json con las claves esperadas', async () => {
  const r = await pedir(servidorDePrueba(), '/api/estado');
  assert.equal(r.status, 200);
  assert.match(r.tipo, /application\/json/);
  const datos = JSON.parse(r.cuerpo);
  assert.ok('proyectos' in datos);
  assert.ok('alertas' in datos);
  assert.ok('maquina' in datos);
  assert.ok('generado' in datos);
});

test('GET / sirve el html', async () => {
  const r = await pedir(servidorDePrueba(), '/');
  assert.equal(r.status, 200);
  assert.match(r.tipo, /text\/html/);
});

test('una ruta inexistente devuelve 404', async () => {
  const r = await pedir(servidorDePrueba(), '/no-existe');
  assert.equal(r.status, 404);
});

test('no se puede salir de web/ con path traversal', async () => {
  const r = await pedir(servidorDePrueba(), '/../config.json');
  assert.equal(r.status, 404);
});
