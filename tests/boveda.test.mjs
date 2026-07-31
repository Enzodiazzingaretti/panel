import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsearFrontmatter, parsearFicha } from '../lib/boveda.mjs';

const aca = dirname(fileURLToPath(import.meta.url));
const completa = readFileSync(join(aca, 'fixtures/ficha-completa.md'), 'utf8');
const minima = readFileSync(join(aca, 'fixtures/ficha-minima.md'), 'utf8');

test('parsea los campos simples del frontmatter', () => {
  const fm = parsearFrontmatter(completa);
  assert.equal(fm.id, 'proyecto-ejemplo');
  assert.equal(fm.titulo, 'Proyecto de Ejemplo');
  assert.equal(fm.estado, 'activo');
  assert.equal(fm.actualizado, '2026-07-21');
});

test('parsea listas del frontmatter como array', () => {
  const fm = parsearFrontmatter(completa);
  assert.deepEqual(fm.stack, ['react', 'vite', 'tailwind', 'vercel']);
  assert.deepEqual(fm.tags, ['portfolio', 'personal']);
});

test('devuelve objeto vacio si no hay frontmatter', () => {
  assert.deepEqual(parsearFrontmatter('# Solo un titulo\n\ntexto'), {});
});

test('extrae el cliente sin corchetes ni comillas', () => {
  const f = parsearFicha(completa);
  assert.equal(f.cliente, 'alguien-apellido');
});

test('la descripcion es el primer parrafo bajo Descripcion', () => {
  const f = parsearFicha(completa);
  assert.equal(f.descripcion, 'Sitio de una sola página con hero 3D. Trilingüe ES/EN/PT.');
});

// En el panel se leia `Sitio para **New Metals**, el emprendimiento` con los asteriscos.
test('la descripcion sale sin marcado de markdown', () => {
  const ficha = [
    '---', 'titulo: X', '---', '',
    '## Descripción', '',
    'Sitio para **New Metals**, de *Gabriel* — ver [[gabriel-diaz]] y',
    '[la guia](https://x.dev) con `npm run dev`.'
  ].join('\n');
  assert.equal(
    parsearFicha(ficha).descripcion,
    'Sitio para New Metals, de Gabriel — ver gabriel-diaz y la guia con npm run dev.'
  );
});

test('un callout de Obsidian no se toma como descripcion', () => {
  const ficha = [
    '---', 'titulo: X', '---', '',
    '## Descripción', '',
    '> [!important] Un aviso que no es la descripcion',
    '> con su segunda linea', '',
    'Este si es el parrafo real.'
  ].join('\n');
  assert.equal(parsearFicha(ficha).descripcion, 'Este si es el parrafo real.');
});

test('la ficha minima no rompe: campos ausentes quedan en null o array vacio', () => {
  const f = parsearFicha(minima);
  assert.equal(f.titulo, 'Proyecto Pelado');
  assert.equal(f.estado, 'pausado');
  assert.equal(f.cliente, null);
  assert.deepEqual(f.stack, []);
  assert.equal(f.descripcion, null);
});
