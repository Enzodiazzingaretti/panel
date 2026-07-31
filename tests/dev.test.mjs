import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  puertoDe, arrancar, detener, detenerTodos, estado, podar, marcarUso, hayAlguno,
  pidDeSalidaNetstat
} from '../lib/dev.mjs';

// Salida real de `netstat -ano` en esta maquina: Vite escucha en IPv6 (`[::1]`), que es
// justo lo que `netstat -p TCP` no muestra.
const NETSTAT = `
Active Connections

  Proto  Local Address          Foreign Address        State           PID
  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       1520
  TCP    127.0.0.1:4321         0.0.0.0:0              LISTENING       9884
  TCP    127.0.0.1:4321         127.0.0.1:51000        ESTABLISHED     9884
  TCP    [::1]:5182             [::]:0                 LISTENING       17088
  TCP    192.168.0.10:51234     140.82.121.4:443       ESTABLISHED     4444
`;

test('encuentra el pid que escucha en un puerto IPv4', () => {
  assert.equal(pidDeSalidaNetstat(NETSTAT, 4321), 9884);
});

test('encuentra el que escucha en IPv6, que es donde se para Vite', () => {
  assert.equal(pidDeSalidaNetstat(NETSTAT, 5182), 17088);
});

test('ignora conexiones establecidas: solo cuenta quien escucha', () => {
  assert.equal(pidDeSalidaNetstat(NETSTAT, 51234), null);
  assert.equal(pidDeSalidaNetstat(NETSTAT, 443), null);
});

test('un puerto libre devuelve null', () => {
  assert.equal(pidDeSalidaNetstat(NETSTAT, 5199), null);
});

// La columna de estado esta traducida segun el idioma de Windows: no se puede comparar
// contra "LISTENING". Se reconoce por la direccion remota comodin.
test('funciona con Windows en espanol', () => {
  const es = '  TCP    [::1]:5183             [::]:0                 ESCUCHANDO      2222\n';
  assert.equal(pidDeSalidaNetstat(es, 5183), 2222);
});

test('una salida vacia o rara no rompe', () => {
  for (const basura of ['', 'no soy netstat', null, undefined]) {
    assert.equal(pidDeSalidaNetstat(basura, 5182), null);
  }
});

const config = { proyectos: { 'kexxy-portfolio': { puertoDev: 5181 }, 'nuevo': {} } };

test('el puerto sale de config cuando esta declarado', () => {
  assert.equal(puertoDe(config, 'kexxy-portfolio', config.proyectos['kexxy-portfolio'], 0), 5181);
});

test('sin puertoDev cae a la base mas el indice, sin chocar entre proyectos', () => {
  assert.equal(puertoDe(config, 'nuevo', config.proyectos.nuevo, 0), 5180);
  assert.equal(puertoDe(config, 'nuevo', config.proyectos.nuevo, 3), 5183);
  assert.notEqual(
    puertoDe(config, 'a', {}, 1),
    puertoDe(config, 'b', {}, 2)
  );
});

test('arrancar sin script de dev falla con un mensaje claro', () => {
  assert.throws(
    () => arrancar('x', { rutaRepo: tmpdir(), script: null, puerto: 5199 }),
    /sin script de dev/
  );
});

test('arrancar sobre una carpeta que no existe falla en vez de dejar basura', () => {
  assert.throws(
    () => arrancar('x', { rutaRepo: join(tmpdir(), 'no-existe-panel-dev'), script: 'dev', puerto: 5199 }),
    /no existe la carpeta/
  );
  assert.equal(estado()['x'], undefined);
});

// `taskkill /T /F` es asincrono y en Windows la carpeta es el `cwd` del hijo: no se
// puede borrar hasta que el proceso muere del todo. `maxRetries` de rmSync no cubre este
// EPERM, asi que se reintenta a mano.
async function limpiar(raiz) {
  for (let i = 0; i < 40; i++) {
    try { rmSync(raiz, { recursive: true, force: true }); return; }
    catch { await new Promise(r => setTimeout(r, 100)); }
  }
  rmSync(raiz, { recursive: true, force: true });
}

// Un proyecto de mentira cuyo "dev" es un node que no termina nunca: alcanza para
// probar el ciclo de vida sin instalar vite.
function proyectoFalso() {
  const raiz = mkdtempSync(join(tmpdir(), 'panel-dev-'));
  mkdirSync(join(raiz, '.git'), { recursive: true });
  writeFileSync(join(raiz, 'package.json'), JSON.stringify({
    name: 'falso',
    scripts: { dev: 'node -e "setInterval(()=>{},1000)"' }
  }));
  return raiz;
}

test('arrancar registra el proceso y detener lo saca del estado', async () => {
  const raiz = proyectoFalso();
  try {
    const e = arrancar('falso', { rutaRepo: raiz, script: 'dev', puerto: 5197 });
    assert.equal(e.puerto, 5197);
    assert.ok(e.pid, 'deberia tener pid');
    assert.equal(estado()['falso'].estado, 'arrancando');
    assert.equal(estado()['falso'].url, 'http://localhost:5197');
    assert.equal(hayAlguno(), true);

    assert.equal(detener('falso'), true);
    assert.equal(estado()['falso'], undefined);
    assert.equal(detener('falso'), false, 'detener dos veces no rompe');
  } finally {
    detenerTodos();
    await limpiar(raiz);
  }
});

test('arrancar dos veces el mismo proyecto no duplica el proceso', async () => {
  const raiz = proyectoFalso();
  try {
    const a = arrancar('falso2', { rutaRepo: raiz, script: 'dev', puerto: 5196 });
    const b = arrancar('falso2', { rutaRepo: raiz, script: 'dev', puerto: 5196 });
    assert.equal(a.pid, b.pid);
    assert.equal(Object.keys(estado()).filter(n => n === 'falso2').length, 1);
  } finally {
    detenerTodos();
    await limpiar(raiz);
  }
});

test('la poda cierra el que hace mas tiempo que no se usa', async () => {
  const raiz = proyectoFalso();
  try {
    arrancar('viejo', { rutaRepo: raiz, script: 'dev', puerto: 5191 });
    await new Promise(r => setTimeout(r, 12));
    arrancar('medio', { rutaRepo: raiz, script: 'dev', puerto: 5192 });
    await new Promise(r => setTimeout(r, 12));
    arrancar('nuevo', { rutaRepo: raiz, script: 'dev', puerto: 5193 });

    // se vuelve a usar el mas viejo: ya no es el candidato a cerrar
    await new Promise(r => setTimeout(r, 12));
    marcarUso('viejo');

    const cerrados = podar(2);
    assert.deepEqual(cerrados, ['medio']);
    assert.ok(estado()['viejo'], 'el usado recien sigue vivo');
    assert.ok(estado()['nuevo']);
    assert.equal(estado()['medio'], undefined);
  } finally {
    detenerTodos();
    await limpiar(raiz);
  }
});

test('la poda no hace nada si no se paso del tope', async () => {
  const raiz = proyectoFalso();
  try {
    arrancar('unico', { rutaRepo: raiz, script: 'dev', puerto: 5190 });
    assert.deepEqual(podar(3), []);
    assert.deepEqual(podar(0), [], 'sin tope configurado no poda');
    assert.ok(estado()['unico']);
  } finally {
    detenerTodos();
    await limpiar(raiz);
  }
});

test('detenerTodos deja el estado vacio', async () => {
  const raiz = proyectoFalso();
  try {
    arrancar('a', { rutaRepo: raiz, script: 'dev', puerto: 5188 });
    arrancar('b', { rutaRepo: raiz, script: 'dev', puerto: 5189 });
    const detenidos = detenerTodos();
    assert.equal(detenidos.length, 2);
    assert.deepEqual(estado(), {});
    assert.equal(hayAlguno(), false);
  } finally {
    await limpiar(raiz);
  }
});
