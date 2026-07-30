import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

import { cargarConfig, resolverMaquina, guardarMaquina } from './lib/maquina.mjs';
import { leerTodos, fetchTodos } from './lib/repos.mjs';
import { leerFicha, contarSesionesSinDestilar } from './lib/boveda.mjs';
import { calcularAlertas } from './lib/alertas.mjs';
import { leerCache, escribirCache } from './lib/cache.mjs';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8'
};

function carpetasDeProyecto(rutaRepos) {
  try {
    return readdirSync(rutaRepos)
      .filter(n => !n.startsWith('.'))
      .filter(n => statSync(join(rutaRepos, n)).isDirectory());
  } catch {
    return [];
  }
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

async function armarEstado({ config, maquina, conFetch }) {
  const enDisco = carpetasDeProyecto(maquina.repos);
  const configurados = Object.keys(config.proyectos ?? {});
  const nombres = [...new Set([...configurados, ...enDisco])]
    .filter(n => existsSync(join(maquina.repos, n)));

  if (conFetch) await fetchTodos(maquina.repos, nombres);

  const git = await leerTodos(maquina.repos, nombres);

  const proyectos = nombres.map(nombre => {
    const cfg = config.proyectos?.[nombre] ?? { ficha: null, prod: null, sinConfigurar: true };
    return {
      nombre,
      git: git[nombre],
      ficha: leerFicha(maquina.boveda, cfg.ficha),
      config: cfg,
      scriptDev: scriptDeDev(join(maquina.repos, nombre))
    };
  });

  const extras = { sesionesSinDestilar: contarSesionesSinDestilar(maquina.boveda) };

  return {
    maquina: { hostname: maquina.hostname, repos: maquina.repos, boveda: maquina.boveda },
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
        const estado = await armarEstado({ config, maquina, conFetch });
        escribirCache(rutaCache, estado);
        return json(200, estado);
      }

      if (url.pathname === '/api/cache') {
        return json(200, leerCache(rutaCache) ?? { vacia: true });
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
}
