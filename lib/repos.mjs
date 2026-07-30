import { execFile, execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const ejecutar = promisify(execFile);
const TIMEOUT = 10_000;

function git(cwd, args) {
  try {
    return execFileSync('git', args, {
      cwd, encoding: 'utf8', timeout: TIMEOUT, stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return null;
  }
}

export function leerRepo(rutaRepo) {
  if (!existsSync(join(rutaRepo, '.git'))) {
    return { esRepo: false };
  }

  const rama = git(rutaRepo, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const estado = git(rutaRepo, ['status', '--porcelain']);
  const sucios = estado ? estado.split('\n').filter(Boolean).length : 0;

  let adelante = null, atras = null;
  const cuenta = git(rutaRepo, ['rev-list', '--left-right', '--count', 'HEAD...@{u}']);
  if (cuenta) {
    const [a, b] = cuenta.split(/\s+/).map(Number);
    adelante = a;
    atras = b;
  }

  const crudo = git(rutaRepo, ['log', '-1', '--format=%h%x1f%s%x1f%ad', '--date=short']);
  const [hash, mensaje, fecha] = crudo ? crudo.split('\x1f') : [null, null, null];

  const ramas = git(rutaRepo, ['branch', '--format=%(refname:short)']);
  const ramasExtra = ramas
    ? ramas.split('\n').map(s => s.trim()).filter(s => s && s !== 'main')
    : [];

  const remoto = git(rutaRepo, ['remote', 'get-url', 'origin']);

  let bats = [];
  try {
    bats = readdirSync(rutaRepo).filter(f => f.toLowerCase().endsWith('.bat'));
  } catch { /* carpeta ilegible: se deja vacio */ }

  return {
    esRepo: true,
    rama,
    sucios,
    adelante,
    atras,
    ultimo: { hash, mensaje, fecha },
    ramasExtra,
    bats,
    residuos: buscarResiduos(rutaRepo),
    remoto: remoto ? remoto.replace(/\.git$/, '') : null
  };
}

// Rastros de plataformas de deploy que no son Vercel. Segun la regla de Enzo
// (0001-deploy-solo-vercel), si aparecen es residuo: hay que borrarlos, no interpretarlos.
function buscarResiduos(rutaRepo) {
  const encontrados = [];

  if (existsSync(join(rutaRepo, 'netlify.toml'))) encontrados.push('netlify.toml');

  const ramasRemotas = git(rutaRepo, ['branch', '-r', '--format=%(refname:short)']);
  if (ramasRemotas?.split('\n').some(r => r.trim().endsWith('/gh-pages'))) {
    encontrados.push('gh-pages');
  }

  const workflows = join(rutaRepo, '.github', 'workflows');
  if (existsSync(workflows)) {
    try {
      for (const archivo of readdirSync(workflows)) {
        const texto = readFileSync(join(workflows, archivo), 'utf8');
        if (/gh-pages|deploy-pages|github\.io/i.test(texto)) {
          encontrados.push('workflow de gh-pages');
          break;
        }
      }
    } catch { /* ilegible: se ignora */ }
  }

  return encontrados;
}

export async function leerTodos(rutaRepos, nombres) {
  const entradas = await Promise.all(
    nombres.map(async (nombre) => [nombre, leerRepo(join(rutaRepos, nombre))])
  );
  return Object.fromEntries(entradas);
}

export async function fetchTodos(rutaRepos, nombres) {
  await Promise.allSettled(
    nombres.map(nombre =>
      ejecutar('git', ['fetch', '--all', '--prune', '--quiet'], {
        cwd: join(rutaRepos, nombre), timeout: 30_000
      })
    )
  );
}
