// Vuelca todo lo que hace falta para diagnosticar el panel en una maquina.
// Corre con `node diagnostico.mjs` o con doble clic en Diagnostico.bat.
// No modifica nada: solo lee y reporta.

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConnection } from 'node:net';
import os from 'node:os';

const raiz = dirname(fileURLToPath(import.meta.url));
const lineas = [];
const log = (t = '') => lineas.push(t);
const titulo = (t) => { log(); log(`## ${t}`); log(); };

function intentar(etiqueta, fn) {
  try {
    return fn();
  } catch (e) {
    log(`  ${etiqueta}: ERROR — ${e.message}`);
    return null;
  }
}

function puertoOcupado(puerto) {
  return new Promise((resolve) => {
    const s = createConnection({ host: '127.0.0.1', port: puerto });
    const cerrar = (r) => { s.destroy(); resolve(r); };
    s.setTimeout(1500);
    s.on('connect', () => cerrar(true));
    s.on('timeout', () => cerrar(false));
    s.on('error', () => cerrar(false));
  });
}

log('# Diagnostico del panel');
log();
log(`Generado: ${new Date().toISOString()}`);

titulo('Maquina');
log(`  hostname   : ${os.hostname()}`);
log(`  plataforma : ${process.platform} ${os.release()}`);
log(`  node       : ${process.version}`);
log(`  raiz       : ${raiz}`);
log(`  ruta con espacios: ${/\s/.test(raiz) ? 'SI (usar node --test tests/*.test.mjs)' : 'no'}`);

titulo('config.json');
const rutaConfig = join(raiz, 'config.json');
log(`  existe: ${existsSync(rutaConfig)}`);

const maquina_ = await import('./lib/maquina.mjs').catch(e => {
  log(`  ERROR importando lib/maquina.mjs — ${e.message}`);
  return null;
});

let config = null;
let maquina = null;

if (maquina_) {
  config = intentar('cargarConfig', () => maquina_.cargarConfig(rutaConfig));

  if (config) {
    log(`  puerto: ${config.puerto ?? '(sin definir, usa 4321)'}`);
    log(`  maquinas registradas: ${Object.keys(config.maquinas ?? {}).join(', ') || '(ninguna)'}`);
    log(`  esta maquina esta registrada: ${Boolean(config.maquinas?.[os.hostname()])}`);

    log();
    log('  candidatos de repos:');
    for (const c of config.candidatos?.repos ?? []) log(`    ${existsSync(c) ? 'OK  ' : 'NO  '} ${c}`);
    log('  candidatos de boveda:');
    for (const c of config.candidatos?.boveda ?? []) log(`    ${existsSync(c) ? 'OK  ' : 'NO  '} ${c}`);

    maquina = intentar('resolverMaquina', () => maquina_.resolverMaquina(config, os.hostname()));
  }
}

titulo('Rutas resueltas');
if (!maquina) {
  log('  NO SE PUDO RESOLVER LA MAQUINA.');
  log('  Es la causa mas probable de que el panel no arranque.');
  log('  Agrega las rutas de esta maquina a "candidatos" en config.json.');
} else {
  log(`  hostname : ${maquina.hostname}`);
  log(`  maquina nueva (autodetectada): ${maquina.nueva}`);
  log(`  repos    : ${maquina.repos}   ${existsSync(maquina.repos) ? '(existe)' : '(NO EXISTE)'}`);
  log(`  boveda   : ${maquina.boveda}  ${existsSync(maquina.boveda) ? '(existe)' : '(NO EXISTE)'}`);

  const proyectosBoveda = join(maquina.boveda, '10-proyectos');
  log(`  10-proyectos de la boveda: ${existsSync(proyectosBoveda) ? 'existe' : 'NO EXISTE'}`);
}

titulo('Carpetas en la carpeta de repos');
if (maquina && existsSync(maquina.repos)) {
  const proyectos_ = await import('./lib/proyectos.mjs').catch(e => {
    log(`  ERROR importando lib/proyectos.mjs — ${e.message}`);
    return null;
  });
  const boveda_ = await import('./lib/boveda.mjs').catch(() => null);

  const carpetas = readdirSync(maquina.repos)
    .filter(n => !n.startsWith('.'))
    .filter(n => { try { return statSync(join(maquina.repos, n)).isDirectory(); } catch { return false; } });

  log(`  ${carpetas.length} carpetas encontradas`);
  log();
  log('  carpeta                        -> clave de config      ficha            git');
  log('  ' + '-'.repeat(88));

  for (const carpeta of carpetas) {
    const clave = proyectos_ ? proyectos_.claveDeCarpeta(config, carpeta) : null;
    const cfg = proyectos_ ? proyectos_.configDeCarpeta(config, carpeta) : {};
    let ficha = '(sin ficha)';
    if (cfg.ficha) {
      const encontrada = boveda_ ? boveda_.leerFicha(maquina.boveda, cfg.ficha) : null;
      ficha = encontrada ? cfg.ficha : `${cfg.ficha} NO ENCONTRADA`;
    }
    const esRepo = existsSync(join(maquina.repos, carpeta, '.git')) ? 'git' : '-';
    log(`  ${carpeta.padEnd(30)} -> ${String(clave ?? 'SIN CONFIGURAR').padEnd(20)} ${ficha.padEnd(16)} ${esRepo}`);
  }
} else {
  log('  no se puede listar: la carpeta de repos no se resolvio o no existe');
}

titulo('Edge (para las miniaturas)');
const mini_ = await import('./lib/miniaturas.mjs').catch(() => null);
if (mini_) {
  const edge = mini_.rutaEdge();
  log(`  ${edge ? 'encontrado: ' + edge : 'NO ENCONTRADO — las miniaturas no van a funcionar'}`);
  const thumbs = join(raiz, 'thumbs');
  const archivos = mini_.listarThumbs(thumbs);
  log(`  miniaturas presentes: ${archivos.length}${archivos.length ? ' (' + archivos.join(', ') + ')' : ' — corre el boton "Actualizar miniaturas"'}`);
} else {
  log('  no se pudo importar lib/miniaturas.mjs');
}

titulo('Puerto');
const puerto = config?.puerto ?? 4321;
const ocupado = await puertoOcupado(puerto);
log(`  ${puerto}: ${ocupado ? 'OCUPADO (ya hay un servidor corriendo)' : 'libre'}`);
if (ocupado) {
  log('  Ojo: el servidor lee config.json solo al arrancar. Si cambiaste la config,');
  log('  hay que matar node antes de volver a probar.');
}

titulo('Prueba de armado del estado');
try {
  const { crearServidor } = await import('./server.mjs');
  if (!maquina) throw new Error('no hay maquina resuelta');
  const servidor = crearServidor({ raiz, config, maquina });
  await new Promise(r => servidor.listen(0, '127.0.0.1', r));
  const { port } = servidor.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/estado`);
  const datos = await res.json();
  await new Promise(r => servidor.close(r));

  log(`  OK. ${datos.proyectos.length} proyectos, ${datos.alertas.length} avisos.`);
  log();
  log('  avisos:');
  for (const a of datos.alertas) log(`    [${a.severidad}] ${a.texto}`);
} catch (e) {
  log(`  FALLO: ${e.message}`);
  log();
  log(e.stack ?? '');
}

log();
log('# Fin');

console.log(lineas.join('\n'));
