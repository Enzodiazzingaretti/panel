import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export function cargarConfig(rutaConfig) {
  return JSON.parse(readFileSync(rutaConfig, 'utf8'));
}

export function resolverMaquina(config, hostname, existe = existsSync) {
  const guardada = config.maquinas?.[hostname];
  if (guardada) {
    return {
      hostname,
      etiqueta: guardada.etiqueta ?? hostname,
      repos: guardada.repos,
      boveda: guardada.boveda,
      nueva: false
    };
  }

  const repos = (config.candidatos?.repos ?? []).find(existe);
  const boveda = (config.candidatos?.boveda ?? []).find(existe);

  if (!repos) {
    throw new Error(
      `No se encontro la carpeta de repos en esta maquina (${hostname}). ` +
      `Agregala a "candidatos.repos" en config.json.`
    );
  }
  if (!boveda) {
    throw new Error(
      `No se encontro la boveda en esta maquina (${hostname}). ` +
      `Agregala a "candidatos.boveda" en config.json.`
    );
  }

  // Una maquina nueva se muestra por su hostname hasta que se le ponga `etiqueta` a mano.
  return { hostname, etiqueta: hostname, repos, boveda, nueva: true };
}

export function guardarMaquina(rutaConfig, hostname, { repos, boveda, etiqueta }) {
  const config = cargarConfig(rutaConfig);
  config.maquinas[hostname] = etiqueta && etiqueta !== hostname
    ? { etiqueta, repos, boveda }
    : { repos, boveda };
  writeFileSync(rutaConfig, JSON.stringify(config, null, 2) + '\n', 'utf8');
}
