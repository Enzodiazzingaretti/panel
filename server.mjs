import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

import { cargarConfig, resolverMaquina, guardarMaquina } from './lib/maquina.mjs';
import { leerTodos, fetchTodos } from './lib/repos.mjs';
import { leerFicha, contarSesionesSinDestilar } from './lib/boveda.mjs';
import { calcularAlertas } from './lib/alertas.mjs';
import { leerCache, escribirCache } from './lib/cache.mjs';
import { ejecutarAccion } from './lib/acciones.mjs';
import { capturarTodas, listarThumbs, elegirMiniatura } from './lib/miniaturas.mjs';
import { indiceDeCarpetas, configDeCarpeta, carpetaValida, listarProyectos } from './lib/proyectos.mjs';
import * as dev from './lib/dev.mjs';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8'
};

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', c => {
      d += c;
      if (d.length > 4096) reject(new Error('cuerpo demasiado grande'));
    });
    req.on('end', () => resolve(d));
    req.on('error', reject);
  });
}

// El boton de dev solo aparece si el proyecto tiene un script que levantar.
function scriptDeDev(rutaRepo) {
  try {
    const pkg = JSON.parse(readFileSync(join(rutaRepo, 'package.json'), 'utf8'));
    if (pkg.scripts?.dev) return 'dev';
    if (pkg.scripts?.start) return 'start';
    return null;
  } catch {
    return null;
  }
}

async function armarEstado({ config, maquina, conFetch, thumbs }) {
  const nombres = listarProyectos(maquina.repos, config);

  if (conFetch) await fetchTodos(maquina.repos, nombres);

  const git = await leerTodos(maquina.repos, nombres);
  const archivosThumbs = listarThumbs(thumbs);

  const indice = indiceDeCarpetas(config);
  const estadoDev = dev.estado();

  const proyectos = nombres.map((nombre, i) => {
    const cfg = configDeCarpeta(config, nombre, indice);
    const scriptDev = scriptDeDev(join(maquina.repos, nombre));
    return {
      nombre,
      git: git[nombre],
      ficha: leerFicha(maquina.boveda, cfg.ficha),
      config: cfg,
      scriptDev,
      puertoDev: scriptDev ? dev.puertoDe(config, nombre, cfg, i) : null,
      dev: estadoDev[nombre] ?? null,
      miniatura: elegirMiniatura(nombre, archivosThumbs)
    };
  });

  const extras = { sesionesSinDestilar: contarSesionesSinDestilar(maquina.boveda) };

  return {
    maquina: {
      hostname: maquina.hostname,
      etiqueta: maquina.etiqueta ?? maquina.hostname,
      repos: maquina.repos,
      boveda: maquina.boveda
    },
    proyectos,
    alertas: calcularAlertas(proyectos, extras, new Date()),
    generado: new Date().toISOString(),
    conFetch: Boolean(conFetch)
  };
}

export function crearServidor({ raiz, config, maquina }) {
  const web = join(raiz, 'web');
  const thumbs = join(raiz, 'thumbs');
  const rutaCache = join(raiz, 'cache.json');

  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const json = (codigo, datos) => {
      res.writeHead(codigo, { 'content-type': TIPOS['.json'] });
      res.end(JSON.stringify(datos));
    };

    try {
      if (url.pathname === '/api/estado') {
        const conFetch = url.searchParams.get('fetch') === '1';
        const estado = await armarEstado({ config, maquina, conFetch, thumbs });
        escribirCache(rutaCache, estado);
        return json(200, estado);
      }

      if (url.pathname === '/api/cache') {
        return json(200, leerCache(rutaCache) ?? { vacia: true });
      }

      // Estado de los dev nada mas: es lo que la interfaz consulta cada pocos segundos
      // mientras hay alguno levantado, y no puede costar un `git fetch` de nueve repos.
      if (url.pathname === '/api/dev' && req.method === 'GET') {
        return json(200, { dev: dev.estado() });
      }

      if (url.pathname === '/api/dev' && req.method === 'POST') {
        const cuerpo = await leerCuerpo(req);
        const { proyecto, accion } = JSON.parse(cuerpo || '{}');

        if (accion === 'detener-todos') {
          return json(200, { detenidos: dev.detenerTodos(), dev: dev.estado() });
        }

        if (!carpetaValida(maquina.repos, proyecto)) {
          return json(400, { error: `Proyecto desconocido: ${proyecto}` });
        }

        try {
          if (accion === 'detener') {
            dev.detener(proyecto);
          } else if (accion === 'arrancar') {
            const nombres = listarProyectos(maquina.repos, config);
            const cfg = configDeCarpeta(config, proyecto);
            dev.arrancar(proyecto, {
              rutaRepo: join(maquina.repos, proyecto),
              script: scriptDeDev(join(maquina.repos, proyecto)),
              puerto: dev.puertoDe(config, proyecto, cfg, nombres.indexOf(proyecto))
            });
            dev.podar(config.dev?.maxSimultaneos);
          } else if (accion === 'usar') {
            dev.marcarUso(proyecto);
          } else {
            return json(400, { error: `Accion de dev no permitida: ${accion}` });
          }
        } catch (e) {
          return json(400, { error: e.message });
        }

        return json(200, { dev: dev.estado() });
      }

      if (url.pathname === '/api/miniaturas' && req.method === 'POST') {
        const r = await capturarTodas(config, thumbs);
        return json(200, r);
      }

      if (url.pathname === '/api/accion' && req.method === 'POST') {
        const cuerpo = await leerCuerpo(req);
        const { proyecto, accion, bat } = JSON.parse(cuerpo || '{}');

        // La carpeta tiene que existir de verdad dentro de la carpeta de repos. Eso es
        // lo que acota lo que el navegador puede pedir, y no las claves de config.json:
        // en la notebook las carpetas se llaman distinto y aun asi tienen que funcionar.
        if (!carpetaValida(maquina.repos, proyecto)) {
          return json(400, { error: `Proyecto desconocido: ${proyecto}` });
        }
        const cfg = configDeCarpeta(config, proyecto);

        const rutaRepo = join(maquina.repos, proyecto);
        const git = (await leerTodos(maquina.repos, [proyecto]))[proyecto];
        const scriptDev = scriptDeDev(rutaRepo);

        try {
          ejecutarAccion(accion, {
            nombre: proyecto,
            rutaRepo,
            prod: cfg.prod,
            remoto: git?.remoto,
            fichaRuta: cfg.ficha ? `10-proyectos/${cfg.ficha}/${cfg.ficha}.md` : null,
            bats: git?.bats ?? [],
            bat,
            scriptDev
          });
          return json(200, { ok: true });
        } catch (e) {
          return json(400, { error: e.message });
        }
      }

      const pedido = url.pathname === '/' ? '/index.html' : url.pathname;
      const base = pedido.startsWith('/thumbs/') ? thumbs : web;
      const relativo = pedido.startsWith('/thumbs/') ? pedido.slice('/thumbs'.length) : pedido;
      const destino = join(base, normalize(relativo).replace(/^([/\\])+/, ''));

      if (!destino.startsWith(base)) {
        res.writeHead(404).end('no encontrado');
        return;
      }

      const contenido = await readFile(destino);
      res.writeHead(200, {
        'content-type': TIPOS[extname(destino).toLowerCase()] ?? 'application/octet-stream',
        'cache-control': 'no-store'
      });
      res.end(contenido);
    } catch (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404).end('no encontrado');
      } else {
        console.error(err);
        json(500, { error: String(err.message ?? err) });
      }
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/') ||
    process.argv[1]?.endsWith('server.mjs')) {
  const raiz = dirname(fileURLToPath(import.meta.url));
  const rutaConfig = join(raiz, 'config.json');
  const config = cargarConfig(rutaConfig);
  const maquina = resolverMaquina(config, os.hostname());

  if (maquina.nueva) {
    guardarMaquina(rutaConfig, maquina.hostname, maquina);
    console.log(`Maquina nueva registrada: ${maquina.hostname}`);
  }

  const puerto = config.puerto ?? 4321;
  crearServidor({ raiz, config, maquina }).listen(puerto, '127.0.0.1', () => {
    console.log(`Panel en http://127.0.0.1:${puerto}`);
  });

  // Los dev los tiene el panel: si el panel se va, se van con el. Sin esto quedan
  // puertos tomados por procesos que ya nadie controla, que es justo lo que este
  // modulo viene a evitar.
  let cerrando = false;
  const cerrar = (senal) => {
    if (cerrando) return;
    cerrando = true;
    const detenidos = dev.detenerTodos();
    if (detenidos.length) console.log(`Dev detenidos: ${detenidos.join(', ')}`);
    if (senal) process.exit(0);
  };

  process.on('exit', () => cerrar(null));
  for (const senal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
    process.on(senal, () => cerrar(senal));
  }

  // Si al panel anterior lo mataron a la fuerza, sus dev siguen vivos y con el puerto
  // tomado. No se matan de prepo al arrancar —puede ser un `npm run dev` que levantaste
  // vos a mano—, pero conviene decirlo: al levantar ese proyecto desde el panel se libera.
  const huerfanos = [];
  for (const [clave, cfg] of Object.entries(config.proyectos ?? {})) {
    if (!Number.isInteger(cfg.puertoDev)) continue;
    const pid = dev.pidEnPuerto(cfg.puertoDev);
    if (pid) huerfanos.push(`${clave} :${cfg.puertoDev} (pid ${pid})`);
  }
  if (huerfanos.length) {
    console.log(`Puertos de dev ya ocupados: ${huerfanos.join(', ')}`);
    console.log('Se liberan solos al levantar ese proyecto desde el panel.');
  }
}
