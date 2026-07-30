import { readFileSync, writeFileSync } from 'node:fs';

export function leerCache(ruta) {
  try {
    return JSON.parse(readFileSync(ruta, 'utf8'));
  } catch {
    return null;
  }
}

export function escribirCache(ruta, datos) {
  try {
    writeFileSync(ruta, JSON.stringify(datos), 'utf8');
  } catch { /* la cache es opcional: si no se puede escribir, no importa */ }
}
