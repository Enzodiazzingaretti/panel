import { spawn, execFile, execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Servidores de desarrollo levantados desde el panel.
//
// La diferencia con el resto de las acciones es que estos procesos **los tiene el
// panel**: se lanzan con stdio conectado, no `detached`, para poder leerles el puerto y
// matarlos despues. Una terminal suelta con `npm run dev` no se puede cerrar desde aca.
//
// Los puertos son fijos por proyecto (`puertoDev` en config.json) y no automaticos, para
// que la URL sea siempre la misma y se pueda dejar en favoritos.

const PUERTO_BASE = 5180;
const MAX_LINEAS = 40;

const corriendo = new Map();

function ahora() { return Date.now(); }

// Vite acepta `--strictPort` y Next no. Se mira el package.json en vez de adivinar: si el
// puerto esta ocupado preferimos que Vite falle a que se mude solo y muestre otro numero.
function sabor(rutaRepo) {
  try {
    const pkg = JSON.parse(readFileSync(join(rutaRepo, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.next) return 'next';
    if (deps.vite) return 'vite';
  } catch { /* sin package.json legible */ }
  return 'otro';
}

export function puertoDe(config, carpeta, cfg, indice = 0) {
  if (Number.isInteger(cfg?.puertoDev)) return cfg.puertoDev;
  return PUERTO_BASE + indice;
}

// Vite y Next imprimen la URL cuando estan listos. Es la confirmacion de que arranco de
// verdad, y ademas cubre el caso de que el puerto pedido no se haya respetado.
const RE_URL = /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):(\d{2,5})/i;

function registrarSalida(entrada, texto) {
  for (const linea of String(texto).split(/\r?\n/)) {
    if (!linea.trim()) continue;
    entrada.salida.push(linea.trim());
    if (entrada.salida.length > MAX_LINEAS) entrada.salida.shift();

    const m = linea.match(RE_URL);
    if (m && entrada.estado !== 'listo') {
      entrada.puertoReal = Number(m[1]);
      entrada.estado = 'listo';
      entrada.listoEn = ahora();
    }
  }
}

// Los handlers de cierre no corren si al panel lo matan a la fuerza o se cuelga: ahi el
// dev sobrevive y deja el puerto tomado por un proceso que ya nadie controla. Verificado
// el 2026-07-31 con `Stop-Process -Force`. No hay forma de atarlos sin dependencias
// nativas (haria falta un Job Object de Windows), asi que se resuelve al reves: antes de
// levantar, si el puerto esta ocupado por algo que no es nuestro, se libera.
// Se separa del comando para poder probarla: parsear netstat tiene dos trampas y las dos
// costaron un rato.
//
//  1. `netstat -p TCP` en Windows filtra **solo IPv4**, y Vite escucha en `[::1]`. Por eso
//     hay que pedir `netstat -ano` pelado y filtrar las lineas TCP a mano.
//  2. La columna de estado esta traducida al idioma de Windows, asi que comparar contra
//     "LISTENING" no es confiable. Una linea de escucha se reconoce por su direccion
//     remota comodin (`0.0.0.0:0` o `[::]:0`), que no se traduce.
export function pidDeSalidaNetstat(texto, puerto) {
  for (const linea of String(texto).split(/\r?\n/)) {
    const cols = linea.trim().split(/\s+/);
    if (cols.length < 5 || !/^TCP$/i.test(cols[0])) continue;

    const m = cols[1].match(/:(\d+)$/);
    if (!m || Number(m[1]) !== puerto) continue;
    if (!/^(0\.0\.0\.0:0|\[::\]:0)$/.test(cols[2])) continue;

    const pid = Number(cols[cols.length - 1]);
    if (Number.isInteger(pid) && pid > 0) return pid;
  }
  return null;
}

export function pidEnPuerto(puerto) {
  if (process.platform !== 'win32') return null;
  try {
    const salida = execFileSync('netstat', ['-ano'], {
      encoding: 'utf8', windowsHide: true, timeout: 5000
    });
    return pidDeSalidaNetstat(salida, puerto);
  } catch {
    return null; // sin netstat: se sigue igual y que falle el arranque si esta ocupado
  }
}

export function liberarPuerto(puerto) {
  const nuestro = [...corriendo.values()].some(e => e.puerto === puerto && e.estado !== 'caido');
  if (nuestro) return null;

  const pid = pidEnPuerto(puerto);
  if (!pid || pid === process.pid) return null;

  if (process.platform === 'win32') {
    try { execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, timeout: 5000 }); }
    catch { return null; }
  }
  return pid;
}

export function arrancar(nombre, { rutaRepo, script, puerto }) {
  const yaEsta = corriendo.get(nombre);
  if (yaEsta && yaEsta.estado !== 'caido') {
    yaEsta.ultimoUso = ahora();
    return yaEsta;
  }
  if (!script) throw new Error(`${nombre}: sin script de dev en package.json`);
  if (!existsSync(rutaRepo)) throw new Error(`${nombre}: no existe la carpeta ${rutaRepo}`);

  const huerfano = liberarPuerto(puerto);

  const tipo = sabor(rutaRepo);
  const args = ['run', script, '--', '--port', String(puerto)];
  if (tipo === 'vite') args.push('--strictPort');

  // `npm` en Windows es npm.cmd: hace falta shell. Los argumentos son todos nuestros
  // —el nombre del script sale de package.json y el puerto es un entero de config—,
  // asi que no hay texto del cliente en la linea de comando.
  const hijo = spawn('npm', args, {
    cwd: rutaRepo,
    shell: true,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const entrada = {
    nombre,
    pid: hijo.pid,
    puerto,
    puertoReal: null,
    estado: 'arrancando',
    tipo,
    desde: ahora(),
    listoEn: null,
    ultimoUso: ahora(),
    salida: [],
    huerfanoLiberado: huerfano,
    proceso: hijo
  };

  if (huerfano) {
    registrarSalida(entrada, `[panel] el puerto ${puerto} estaba tomado por el pid ${huerfano} (dev huerfano); se libero`);
  }

  hijo.stdout.on('data', d => registrarSalida(entrada, d));
  hijo.stderr.on('data', d => registrarSalida(entrada, d));

  hijo.on('exit', codigo => {
    entrada.estado = 'caido';
    entrada.codigoSalida = codigo;
    entrada.proceso = null;
  });

  hijo.on('error', err => {
    entrada.estado = 'caido';
    registrarSalida(entrada, `error al lanzar npm: ${err.message}`);
  });

  corriendo.set(nombre, entrada);
  return entrada;
}

// En Windows `npm run dev` deja un arbol (cmd → node → vite). Matar solo el pid deja el
// puerto tomado, que es exactamente el problema que este modulo viene a resolver.
export function detener(nombre) {
  const entrada = corriendo.get(nombre);
  if (!entrada) return false;

  const pid = entrada.pid;
  corriendo.delete(nombre);

  if (entrada.proceso && pid) {
    if (process.platform === 'win32') {
      execFile('taskkill', ['/PID', String(pid), '/T', '/F'], () => {});
    } else {
      try { process.kill(-pid, 'SIGTERM'); } catch { try { entrada.proceso.kill(); } catch {} }
    }
  }
  return true;
}

export function detenerTodos() {
  const nombres = [...corriendo.keys()];
  for (const n of nombres) detener(n);
  return nombres;
}

// "Automatico cuando haga falta": si se pasa del tope, se cierra el que hace mas tiempo
// que no se usa. Levantar cinco Vite a la vez come RAM y no los mira nadie.
export function podar(maxSimultaneos) {
  if (!Number.isInteger(maxSimultaneos) || maxSimultaneos <= 0) return [];

  const vivos = [...corriendo.values()].filter(e => e.estado !== 'caido');
  if (vivos.length <= maxSimultaneos) return [];

  vivos.sort((a, b) => a.ultimoUso - b.ultimoUso);
  const sobran = vivos.slice(0, vivos.length - maxSimultaneos);
  for (const e of sobran) detener(e.nombre);
  return sobran.map(e => e.nombre);
}

export function marcarUso(nombre) {
  const e = corriendo.get(nombre);
  if (e) e.ultimoUso = ahora();
}

// Lo que ve el navegador: sin el handle del proceso, que no es serializable.
export function estado() {
  const salida = {};
  for (const [nombre, e] of corriendo) {
    const puerto = e.puertoReal ?? e.puerto;
    salida[nombre] = {
      pid: e.pid,
      puerto,
      url: `http://localhost:${puerto}`,
      estado: e.estado,
      tipo: e.tipo,
      desde: e.desde,
      segundos: Math.round((ahora() - e.desde) / 1000),
      error: e.estado === 'caido' ? e.salida.slice(-3).join(' · ') : null
    };
  }
  return salida;
}

export function hayAlguno() {
  return [...corriendo.values()].some(e => e.estado !== 'caido');
}
