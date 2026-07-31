export const DIAS_DERIVA_FICHA = 2;

const ORDEN = { alta: 0, media: 1, baja: 2 };

export function formatoArs(n) {
  return `$${Math.round(n).toLocaleString('es-AR')}`;
}

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

  // Finanzas: lo que importa son los vencimientos, no el total. Un gasto pendiente sin
  // monto igual se avisa — no saber cuanto debes es peor que deber.
  const fin = extras.finanzas;
  if (fin) {
    if (fin.vencidos.length) {
      const n = fin.vencidos.length;
      const plata = fin.totalVencido > 0 ? `, ${formatoArs(fin.totalVencido)} confirmados` : '';
      push('alta', null, `${n} ${n === 1 ? 'pago vencido' : 'pagos vencidos'}${plata}: ${fin.vencidos.join(', ')}`);
    }

    const porVencer = fin.pendientes - fin.vencidos.length;
    if (porVencer > 0) {
      push('media', null, `${porVencer} ${porVencer === 1 ? 'pago pendiente' : 'pagos pendientes'} este mes`);
    }

    if (fin.sinMonto.length) {
      push('media', null, `${fin.sinMonto.length} pagos pendientes sin monto cargado: ${fin.sinMonto.join(', ')}`);
    }

    if (fin.aRevisar.length) {
      push('baja', null, `a revisar en finanzas: ${fin.aRevisar.join(', ')}`);
    }
  }

  if (extras.sesionesSinDestilar > 0) {
    const n = extras.sesionesSinDestilar;
    push('baja', null, `${n} ${n === 1 ? 'sesion' : 'sesiones'} sin destilar en el inbox`);
  }

  return avisos.sort((a, b) => ORDEN[a.severidad] - ORDEN[b.severidad]);
}
