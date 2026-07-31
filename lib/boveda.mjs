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

// Las fichas estan escritas en markdown y la descripcion sale tal cual: en el panel se
// leia `Sitio para **New Metals**, el emprendimiento` con los asteriscos a la vista. Se
// saca el marcado inline mas comun, que es lo unico que aparece en un primer parrafo.
function limpiarMarkdown(texto) {
  return texto
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')            // imagenes
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, destino, alias) => alias ?? destino)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')          // links
    .replace(/`([^`]+)`/g, '$1')                      // codigo
    .replace(/\*\*([^*]+)\*\*/g, '$1')                // negrita
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2')          // cursiva
    .replace(/(^|[^_])__([^_]+)__/g, '$1$2')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function primerParrafo(texto, encabezado) {
  const re = new RegExp(`^##\\s+${encabezado}\\s*$`, 'im');
  const m = texto.match(re);
  if (!m) return null;

  const resto = texto.slice(m.index + m[0].length);
  for (const bloque of resto.split(/\r?\n\r?\n/)) {
    const limpio = bloque.trim();
    // Los callouts de Obsidian (`> [!important]`) no son la descripcion.
    if (limpio && !limpio.startsWith('#') && !limpio.startsWith('>')) {
      return limpiarMarkdown(limpio.replace(/\r?\n/g, ' '));
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
