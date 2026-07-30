import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

const ejecutar = promisify(execFile);

const RUTAS_EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];

export function rutaEdge() {
  return RUTAS_EDGE.find(existsSync) ?? null;
}

export function elegirMiniatura(nombre, archivos) {
  const manual = `${nombre}-manual`;
  const desktop = `${nombre}-desktop`;
  const buscar = (base) => archivos.find(a => a.replace(/\.(png|webp|jpg)$/i, '') === base);
  return buscar(manual) ?? buscar(desktop) ?? null;
}

export async function capturar(url, destino, { ancho = 1280, alto = 800 } = {}) {
  const edge = rutaEdge();
  if (!edge) return false;

  // Edge necesita un perfil propio para no pelearse con la sesion abierta del usuario
  const perfil = mkdtempSync(join(tmpdir(), 'panel-edge-'));
  try {
    await ejecutar(edge, [
      '--headless=new',
      '--disable-gpu',
      `--user-data-dir=${perfil}`,
      `--window-size=${ancho},${alto}`,
      `--screenshot=${destino}`,
      '--virtual-time-budget=12000',
      '--hide-scrollbars',
      url
    ], { timeout: 60_000 });
    return existsSync(destino);
  } catch {
    return false;
  } finally {
    rmSync(perfil, { recursive: true, force: true });
  }
}

export async function capturarTodas(config, dirThumbs) {
  mkdirSync(dirThumbs, { recursive: true });
  const capturadas = [];
  const omitidas = [];

  for (const [nombre, cfg] of Object.entries(config.proyectos ?? {})) {
    if (!cfg.prod) { omitidas.push(nombre); continue; }

    const okDesktop = await capturar(cfg.prod, join(dirThumbs, `${nombre}-desktop.png`), { ancho: 1280, alto: 800 });
    await capturar(cfg.prod, join(dirThumbs, `${nombre}-mobile.png`), { ancho: 390, alto: 844 });

    (okDesktop ? capturadas : omitidas).push(nombre);
  }

  return { capturadas, omitidas };
}

export function listarThumbs(dirThumbs) {
  try {
    return readdirSync(dirThumbs).filter(a => /\.(png|webp|jpg)$/i.test(a));
  } catch {
    return [];
  }
}
