import { statSync } from 'node:fs';
import { resolve } from 'node:path';

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
