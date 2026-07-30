import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function parsearFrontmatter(texto) {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};

  const campos = {};
  for (const linea of m[1].split(/\r?\n/)) {
    const par = linea.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (!par) continue;
    const clave = par[1];
    let valor = par[2].trim();

    if (valor.startsWith('[') && valor.endsWith(']')) {
      campos[clave] = valor
        .slice(1, -1)
        .split(',')
        .map(s => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      campos[clave] = valor.replace(/^["']|["']$/g, '');
    }
  }
  return campos;
}

function primerParrafo(texto, encabezado) {
  const re = new RegExp(`^##\\s+${encabezado}\\s*$`, 'im');
  const m = texto.match(re);
  if (!m) return null;

  const resto = texto.slice(m.index + m[0].length);
  for (const bloque of resto.split(/\r?\n\r?\n/)) {
    const limpio = bloque.trim();
    if (limpio && !limpio.startsWith('#')) {
      return limpio.replace(/\r?\n/g, ' ');
    }
  }
  return null;
}

export function parsearFicha(texto) {
  const fm = parsearFrontmatter(texto);
  const cliente = typeof fm.cliente === 'string' && fm.cliente
    ? fm.cliente.replace(/^\[\[|\]\]$/g, '') || null
    : null;

  return {
    titulo: fm.titulo ?? null,
    estado: fm.estado ?? null,
    stack: Array.isArray(fm.stack) ? fm.stack : (fm.stack ? [fm.stack] : []),
    cliente,
    actualizado: fm.actualizado ?? null,
    descripcion: primerParrafo(texto, 'Descripción')
  };
}

export function leerFicha(rutaBoveda, slug) {
  if (!slug) return null;
  const ruta = join(rutaBoveda, '10-proyectos', slug, `${slug}.md`);
  if (!existsSync(ruta)) return null;
  return parsearFicha(readFileSync(ruta, 'utf8'));
}

export function contarSesionesSinDestilar(rutaBoveda) {
  const inbox = join(rutaBoveda, '00-inbox');
  if (!existsSync(inbox)) return 0;
  try {
    return readdirSync(inbox).filter(f => /^sesion-.*\.txt$/i.test(f)).length;
  } catch {
    return 0;
  }
}
