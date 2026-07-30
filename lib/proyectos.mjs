import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// El mapa de `config.proyectos` indexa por nombre de carpeta, pero las carpetas se
// llaman distinto segun la maquina: en la notebook son `aurora-retreat`,
// `creative-agency-template`, `sommelier-portfolio` y `veil`. Los `alias` de cada
// proyecto resuelven esa diferencia, y la busqueda ignora mayusculas.

export function indiceDeCarpetas(config) {
  const indice = new Map();
  for (const [clave, cfg] of Object.entries(config.proyectos ?? {})) {
    indice.set(clave.toLowerCase(), clave);
    for (const alias of cfg.alias ?? []) {
      indice.set(String(alias).toLowerCase(), clave);
    }
  }
  return indice;
}

export function claveDeCarpeta(config, carpeta, indice = indiceDeCarpetas(config)) {
  return indice.get(String(carpeta).toLowerCase()) ?? null;
}

export function configDeCarpeta(config, carpeta, indice = indiceDeCarpetas(config)) {
  const clave = claveDeCarpeta(config, carpeta, indice);
  return clave
    ? config.proyectos[clave]
    : { ficha: null, prod: null, sinConfigurar: true };
}

// `.git` es una carpeta en un repo normal y un archivo en un worktree: alcanza con que exista.
export function esRepoGit(ruta) {
  return existsSync(join(ruta, '.git'));
}

// En la PC principal la carpeta de repos es dedicada, pero en la notebook es
// `C:\Users\Enzo\Documents`, que tiene adentro Ableton, rekordbox, My Pictures y otras
// nueve carpetas que no son proyectos. Se listan solo las que son repos de git, mas las
// declaradas en config (que pueden no serlo todavia).
//
// Los nombres salen SIEMPRE del disco. Tomar tambien las claves de config y filtrarlas
// por `existsSync` —que en Windows ignora mayusculas— hacia aparecer `VEIL` y `veil` como
// dos proyectos distintos siendo la misma carpeta. Nada se pierde: una clave que existe en
// disco ya viene en el listado con su nombre real, y el indice la resuelve igual.
export function listarProyectos(rutaRepos, config) {
  let nombres;
  try {
    nombres = readdirSync(rutaRepos).filter(n => !n.startsWith('.'));
  } catch {
    return [];
  }

  const indice = indiceDeCarpetas(config);
  const orden = Object.keys(config.proyectos ?? {});
  const posicion = nombre => {
    const clave = claveDeCarpeta(config, nombre, indice);
    const i = clave ? orden.indexOf(clave) : -1;
    return i === -1 ? orden.length : i;
  };

  return nombres
    .filter(n => {
      try {
        if (!statSync(join(rutaRepos, n)).isDirectory()) return false;
      } catch {
        return false;
      }
      return indice.has(n.toLowerCase()) || esRepoGit(join(rutaRepos, n));
    })
    .sort((a, b) => posicion(a) - posicion(b) || a.localeCompare(b));
}

// Una carpeta solo es valida si es un directorio real DENTRO de la carpeta de repos.
// Es lo que impide que el navegador mande una ruta arbitraria al endpoint de acciones.
export function carpetaValida(rutaRepos, carpeta) {
  if (typeof carpeta !== 'string' || !carpeta) return false;
  if (/[\\/]/.test(carpeta) || carpeta.startsWith('.')) return false;

  const base = resolve(rutaRepos);
  const destino = resolve(base, carpeta);
  if (destino === base || !destino.startsWith(base)) return false;

  try {
    return statSync(destino).isDirectory();
  } catch {
    return false;
  }
}
