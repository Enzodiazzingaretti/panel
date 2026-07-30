export const DIAS_DERIVA_FICHA = 2;

const ORDEN = { alta: 0, media: 1, baja: 2 };

function dias(desde, hasta) {
  const a = new Date(`${desde}T00:00:00`);
  const b = hasta instanceof Date ? hasta : new Date(`${hasta}T00:00:00`);
  return Math.round((b - a) / 86_400_000);
}

export function calcularAlertas(proyectos, extras = {}, hoy = new Date()) {
  const avisos = [];
  const push = (severidad, proyecto, texto) => avisos.push({ severidad, proyecto, texto });

  for (const { nombre, git, ficha, config } of proyectos) {
    if (!git?.esRepo) {
      // Con el filtro de `listarProyectos` una carpeta que no es repo solo llega hasta aca
      // si esta declarada en config, y ahi el aviso sirve: es un proyecto que deberia
      // estar versionado y no lo esta. Una carpeta suelta no es asunto del panel.
      if (config && !config.sinConfigurar) {
        push('media', nombre, `${nombre}: la carpeta no es un repo de git`);
      }
      continue;
    }

    if (git.atras > 0) {
      push('alta', nombre, `${nombre}: ${git.atras} commits sin traer del remoto`);
    }
    if (git.adelante > 0) {
      push('media', nombre, `${nombre}: ${git.adelante} commits sin pushear`);
    }
    if (git.rama && git.rama !== 'main') {
      push('media', nombre, `${nombre}: no esta en main, esta en ${git.rama}`);
    }
    if (git.ramasExtra?.length) {
      push('media', nombre, `${nombre}: sobra la rama ${git.ramasExtra.join(', ')}`);
    }
    if (git.sucios > 0) {
      const plural = git.sucios === 1 ? 'archivo' : 'archivos';
      push('baja', nombre, `${nombre}: ${git.sucios} ${plural} sin commitear`);
    }
    if (git.residuos?.length) {
      push('media', nombre, `${nombre}: restos de otro deploy (${git.residuos.join(', ')})`);
    }

    if (config && !config.ficha) {
      push('media', nombre, `${nombre}: sin ficha en la boveda`);
    } else if (ficha?.actualizado && git.ultimo?.fecha) {
      const deriva = dias(ficha.actualizado, git.ultimo.fecha);
      if (deriva >= DIAS_DERIVA_FICHA) {
        push('alta', nombre, `${nombre}: la ficha esta ${deriva} dias atras del codigo`);
      }
    }
  }

  if (extras.sesionesSinDestilar > 0) {
    const n = extras.sesionesSinDestilar;
    push('baja', null, `${n} ${n === 1 ? 'sesion' : 'sesiones'} sin destilar en el inbox`);
  }

  return avisos.sort((a, b) => ORDEN[a.severidad] - ORDEN[b.severidad]);
}
