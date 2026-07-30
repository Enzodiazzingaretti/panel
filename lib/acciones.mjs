import { spawn } from 'node:child_process';

export const ACCIONES = ['claude', 'vscode', 'dev', 'prod', 'github', 'ficha', 'bat'];

function abrirUrl(url) {
  // start necesita un titulo vacio como primer argumento cuando la url va citada
  return { programa: 'cmd', args: ['/c', 'start', '', url], cwd: undefined, detached: true };
}

function terminalEn(rutaRepo, comando) {
  return {
    programa: 'cmd',
    args: ['/c', 'start', '', 'cmd', '/k', comando],
    cwd: rutaRepo,
    detached: true
  };
}

export function armarComando(accion, ctx) {
  if (!ACCIONES.includes(accion)) {
    throw new Error(`Accion no permitida: ${accion}`);
  }

  switch (accion) {
    case 'vscode':
      return { programa: 'cmd', args: ['/c', 'code', ctx.rutaRepo], cwd: ctx.rutaRepo, detached: true };

    case 'claude':
      return terminalEn(ctx.rutaRepo, 'claude');

    case 'dev': {
      if (!ctx.scriptDev) throw new Error(`${ctx.nombre}: sin script de dev en package.json`);
      return terminalEn(ctx.rutaRepo, `npm run ${ctx.scriptDev}`);
    }

    case 'prod': {
      if (!ctx.prod) throw new Error(`${ctx.nombre}: sin URL de produccion configurada`);
      return abrirUrl(ctx.prod);
    }

    case 'github': {
      if (!ctx.remoto) throw new Error(`${ctx.nombre}: sin remoto de git`);
      return abrirUrl(ctx.remoto);
    }

    case 'ficha': {
      if (!ctx.fichaRuta) throw new Error(`${ctx.nombre}: sin ficha en la boveda`);
      const archivo = encodeURIComponent(ctx.fichaRuta);
      return abrirUrl(`obsidian://open?vault=boveda&file=${archivo}`);
    }

    case 'bat': {
      if (!ctx.bats?.includes(ctx.bat)) {
        throw new Error(`${ctx.bat} no existe en el repo ${ctx.nombre}`);
      }
      return terminalEn(ctx.rutaRepo, ctx.bat);
    }
  }
}

export function ejecutarAccion(accion, ctx) {
  const { programa, args, cwd, detached } = armarComando(accion, ctx);
  const hijo = spawn(programa, args, { cwd, detached, stdio: 'ignore', windowsHide: false });
  hijo.unref();
  return { ok: true };
}
