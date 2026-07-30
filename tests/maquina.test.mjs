import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolverMaquina } from '../lib/maquina.mjs';

const config = {
  maquinas: {
    'DESKTOP-HM0V74B': { repos: 'D:\\Disco D\\GitHubRepos', boveda: 'D:\\Drive\\boveda' }
  },
  candidatos: {
    repos: ['D:\\Disco D\\GitHubRepos', 'C:\\Users\\Enzo\\Documents'],
    boveda: ['D:\\Drive\\boveda', 'G:\\My Drive\\boveda']
  }
};

test('usa la entrada de la maquina cuando el hostname ya esta en config', () => {
  const r = resolverMaquina(config, 'DESKTOP-HM0V74B', () => true);
  assert.equal(r.repos, 'D:\\Disco D\\GitHubRepos');
  assert.equal(r.boveda, 'D:\\Drive\\boveda');
  assert.equal(r.nueva, false);
});

test('autodetecta probando candidatos cuando el hostname es desconocido', () => {
  const existe = (ruta) => ruta === 'C:\\Users\\Enzo\\Documents' || ruta === 'G:\\My Drive\\boveda';
  const r = resolverMaquina(config, 'LAPTOP-NUEVA', existe);
  assert.equal(r.repos, 'C:\\Users\\Enzo\\Documents');
  assert.equal(r.boveda, 'G:\\My Drive\\boveda');
  assert.equal(r.nueva, true);
  assert.equal(r.hostname, 'LAPTOP-NUEVA');
});

// Se trabaja desde dos maquinas y el panel es igual en las dos: tiene que decir en cual estas.
test('devuelve la etiqueta legible de la maquina', () => {
  const conEtiqueta = {
    ...config,
    maquinas: { 'DESKTOP-9BH2BPQ': { etiqueta: 'Notebook', repos: 'C:\\x', boveda: 'G:\\y' } }
  };
  assert.equal(resolverMaquina(conEtiqueta, 'DESKTOP-9BH2BPQ', () => true).etiqueta, 'Notebook');
});

test('sin etiqueta cae al hostname en vez de quedar vacia', () => {
  assert.equal(resolverMaquina(config, 'DESKTOP-HM0V74B', () => true).etiqueta, 'DESKTOP-HM0V74B');
  assert.equal(resolverMaquina(config, 'LAPTOP-NUEVA', () => true).etiqueta, 'LAPTOP-NUEVA');
});

test('falla con un mensaje claro si ningun candidato existe', () => {
  assert.throws(
    () => resolverMaquina(config, 'OTRA-PC', () => false),
    /No se encontro la carpeta de repos/
  );
});

test('la entrada de la maquina gana aunque los candidatos tambien existan', () => {
  const r = resolverMaquina(config, 'DESKTOP-HM0V74B', () => true);
  assert.equal(r.repos, 'D:\\Disco D\\GitHubRepos');
});
