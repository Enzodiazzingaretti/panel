const $ = (sel) => document.querySelector(sel);

const MARCA = { alta: 'atencion', media: 'revisar', baja: 'menor' };

function textoMeta(p) {
  const partes = [];
  const g = p.git ?? {};

  if (g.rama) {
    partes.push(g.rama === 'main'
      ? `<span>rama <span class="marcador">main</span></span>`
      : `<span class="sucio">rama ${g.rama}</span>`);
  }
  if (g.atras > 0) partes.push(`<span class="atras">${g.atras} sin traer</span>`);
  if (g.adelante > 0) partes.push(`<span class="sucio">${g.adelante} sin pushear</span>`);
  if (g.sucios > 0) partes.push(`<span class="sucio">${g.sucios} sin commitear</span>`);
  if (g.ultimo?.fecha) partes.push(`<span>${g.ultimo.fecha}</span>`);
  if (p.ficha?.estado) partes.push(`<span>${p.ficha.estado}</span>`);

  return partes.join('');
}

// El dev es la unica accion con estado: el resto lanza algo y se olvida, esta se
// enciende y se apaga. Por eso tiene su propia fila arriba de los botones.
function bloqueDev(p) {
  if (!p.scriptDev) return '';
  const d = p.dev;

  if (!d || d.estado === 'caido') {
    const fallo = d?.error
      ? `<span class="dev-error" title="${escapar(d.error)}">se cayó</span>`
      : '';
    return `<div class="dev">
      <button class="dev-arrancar" data-dev="arrancar">Levantar dev</button>
      <span class="dev-puerto">:${p.puertoDev}</span>${fallo}
    </div>`;
  }

  if (d.estado === 'arrancando') {
    return `<div class="dev arrancando">
      <span class="dev-pulso"></span>
      <span class="dev-texto">levantando en :${d.puerto}…</span>
      <button data-dev="detener">Cancelar</button>
    </div>`;
  }

  return `<div class="dev listo">
    <span class="dev-pulso"></span>
    <a class="dev-link" href="${d.url}" target="_blank" rel="noreferrer" data-dev="usar">localhost:${d.puerto}</a>
    <button data-dev="detener">Detener</button>
  </div>`;
}

function escapar(t) {
  return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function botones(p) {
  const b = [];
  b.push(`<button data-accion="claude">Claude</button>`);
  b.push(`<button data-accion="vscode">VS Code</button>`);
  if (p.config?.prod) b.push(`<button data-accion="prod">Producción</button>`);
  if (p.git?.remoto) b.push(`<button data-accion="github">GitHub</button>`);
  if (p.config?.ficha) b.push(`<button data-accion="ficha">Ficha</button>`);
  for (const bat of p.git?.bats ?? []) {
    b.push(`<button data-accion="bat" data-bat="${bat}">${bat.replace(/\.bat$/i, '')}</button>`);
  }
  return b.join('');
}

function tarjeta(p) {
  const foto = p.miniatura
    ? `style="background-image:url('/thumbs/${encodeURIComponent(p.miniatura)}')"`
    : '';
  const desc = p.ficha?.descripcion ?? (p.config?.ficha ? '' : 'Sin ficha en la bóveda');

  return `
    <article class="tarjeta ${p.miniatura ? '' : 'sin-foto'}" data-proyecto="${p.nombre}">
      <div class="foto" ${foto}></div>
      <div class="cuerpo">
        <h3 class="nombre">${p.ficha?.titulo ?? p.nombre}</h3>
        <p class="descripcion">${desc}</p>
        <div class="meta">${textoMeta(p)}</div>
        ${bloqueDev(p)}
        <div class="botones">${botones(p)}</div>
      </div>
    </article>`;
}

// ── finanzas ───────────────────────────────────────────────────────────────
const ars = (n) => `$${Math.round(n).toLocaleString('es-AR')}`;

function dibujarFinanzas(fin) {
  const seccion = $('#finanzas');
  if (!fin || !fin.items?.length) { seccion.hidden = true; return; }
  seccion.hidden = false;

  // El total del mes es contexto; lo que importa es lo vencido. Por eso va primero y
  // es lo unico que se tiñe.
  const fichas = [];
  if (fin.totalVencido > 0 || fin.vencidos.length) {
    fichas.push(`<div class="fin-ficha vencido">
      <span class="fin-rotulo">vencido</span>
      <strong>${ars(fin.totalVencido)}</strong>
      <span class="fin-nota">${fin.vencidos.length} ${fin.vencidos.length === 1 ? 'pago' : 'pagos'}</span>
    </div>`);
  }
  fichas.push(`<div class="fin-ficha">
    <span class="fin-rotulo">pendiente del mes</span>
    <strong>${ars(fin.totalPendiente)}</strong>
    <span class="fin-nota">${fin.sinMonto.length ? `+ ${fin.sinMonto.length} sin monto` : 'todo con monto'}</span>
  </div>`);
  fichas.push(`<div class="fin-ficha">
    <span class="fin-rotulo">total mensual</span>
    <strong>${ars(fin.totalMensual)}</strong>
    <span class="fin-nota">fijos + suscripciones</span>
  </div>`);
  if (fin.totalProximos > 0) {
    fichas.push(`<div class="fin-ficha">
      <span class="fin-rotulo">meses siguientes</span>
      <strong>${ars(fin.totalProximos)}</strong>
      <span class="fin-nota">${fin.proximos.length} cuotas</span>
    </div>`);
  }
  $('#finanzas-resumen').innerHTML = fichas.join('');

  const ROTULO = { pendiente: 'pendiente', pagado: 'pagado', revisar: 'revisar' };
  $('#finanzas-lista').innerHTML = fin.items.map(i => {
    const clases = ['fin-item', i.estado, i.vencido ? 'vencido' : '', i.futuro ? 'futuro' : ''];
    const cuando = i.vencido
      ? `venció hace ${i.diasDeAtraso} ${i.diasDeAtraso === 1 ? 'día' : 'días'}`
      : escapar(i.vencimientoTexto);
    return `<div class="${clases.filter(Boolean).join(' ')}" title="${escapar(i.notas || '')}">
      <span class="fin-estado">${ROTULO[i.estado] ?? i.estado}</span>
      <span class="fin-concepto">${escapar(i.concepto)}</span>
      <span class="fin-cuando">${cuando}</span>
      <span class="fin-monto">${i.monto ? ars(i.monto) : escapar(i.montoTexto)}</span>
    </div>`;
  }).join('');
}

function dibujar(datos) {
  // Se trabaja desde dos maquinas y el panel es igual en las dos: conviene que diga en
  // cual estas de un vistazo. La etiqueta va adelante y el hostname al lado, salvo que no
  // haya etiqueta (maquina nueva sin configurar) y entonces alcanza con el hostname.
  const { etiqueta, hostname } = datos.maquina;
  const donde = etiqueta && etiqueta !== hostname
    ? `<strong class="etiqueta-maquina">${etiqueta}</strong> · ${hostname}`
    : hostname;
  $('#maquina').innerHTML = `${donde} · ${datos.proyectos.length} proyectos`;

  $('#alertas').innerHTML = (datos.alertas ?? [])
    .map(a => `<div class="aviso ${a.severidad}"><span class="marca">${MARCA[a.severidad]}</span><span>${a.texto}</span></div>`)
    .join('');

  $('#grilla').innerHTML = datos.proyectos.map(tarjeta).join('');

  ultimoEstado = datos;
  pintarDev(Object.fromEntries(
    datos.proyectos.filter(p => p.dev).map(p => [p.nombre, p.dev])
  ));

  dibujarFinanzas(datos.finanzas);

  const cuando = new Date(datos.generado).toLocaleString('es-AR');
  $('#generado').textContent = datos.conFetch
    ? `Actualizado con el remoto · ${cuando}`
    : `Estado local · ${cuando}`;
}

async function cargar({ conFetch = false } = {}) {
  const res = await fetch(`/api/estado${conFetch ? '?fetch=1' : ''}`);
  dibujar(await res.json());
}

async function accion(proyecto, nombre, bat) {
  const res = await fetch('/api/accion', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ proyecto, accion: nombre, bat })
  });
  if (!res.ok) {
    const { error } = await res.json();
    alert(error);
  }
}

// ── dev ────────────────────────────────────────────────────────────────────
// El estado de los dev cambia solo (arrancando → listo, o se cae), asi que se sondea,
// pero unicamente mientras haya alguno vivo: con todo apagado el panel no hace nada.
let ultimoEstado = null;
let sondeo = null;

function pintarDev(mapaDev) {
  if (!ultimoEstado) return;
  for (const p of ultimoEstado.proyectos) p.dev = mapaDev[p.nombre] ?? null;

  for (const p of ultimoEstado.proyectos) {
    const tarjeta = document.querySelector(`.tarjeta[data-proyecto="${CSS.escape(p.nombre)}"]`);
    const bloque = tarjeta?.querySelector('.dev');
    if (!tarjeta || !p.scriptDev) continue;
    const nuevo = bloqueDev(p);
    if (bloque) bloque.outerHTML = nuevo;
    else tarjeta.querySelector('.botones')?.insertAdjacentHTML('beforebegin', nuevo);
  }

  const vivos = Object.values(mapaDev).filter(d => d.estado !== 'caido').length;
  $('#detener-dev').hidden = vivos === 0;
  $('#detener-dev').textContent = vivos === 1 ? 'Detener el dev' : `Detener los ${vivos} dev`;

  if (vivos > 0) arrancarSondeo();
  else pararSondeo();
}

function arrancarSondeo() {
  if (sondeo) return;
  sondeo = setInterval(async () => {
    try {
      const { dev } = await (await fetch('/api/dev')).json();
      pintarDev(dev);
    } catch { pararSondeo(); }
  }, 1500);
}

function pararSondeo() {
  if (sondeo) { clearInterval(sondeo); sondeo = null; }
}

async function accionDev(proyecto, accion) {
  const res = await fetch('/api/dev', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ proyecto, accion })
  });
  const datos = await res.json();
  if (!res.ok) { alert(datos.error); return; }
  pintarDev(datos.dev);
}

$('#detener-dev').addEventListener('click', async () => {
  const res = await fetch('/api/dev', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ accion: 'detener-todos' })
  });
  pintarDev((await res.json()).dev);
});

$('#grilla').addEventListener('click', (e) => {
  const tarjeta = e.target.closest('.tarjeta');
  if (!tarjeta) return;
  const proyecto = tarjeta.dataset.proyecto;

  // el link al dev abre el navegador solo: aca solo se marca que se uso, para que la
  // poda automatica no cierre justo el que estabas mirando
  const link = e.target.closest('a[data-dev="usar"]');
  if (link) { accionDev(proyecto, 'usar'); return; }

  const botonDev = e.target.closest('button[data-dev]');
  if (botonDev) { accionDev(proyecto, botonDev.dataset.dev); return; }

  const boton = e.target.closest('button[data-accion]');
  if (boton) accion(proyecto, boton.dataset.accion, boton.dataset.bat);
});

$('#refrescar').addEventListener('click', async (e) => {
  e.target.disabled = true;
  e.target.textContent = 'Consultando el remoto…';
  await cargar({ conFetch: true });
  e.target.disabled = false;
  e.target.textContent = 'Refrescar';
});

$('#capturar').addEventListener('click', async (e) => {
  e.target.disabled = true;
  e.target.textContent = 'Capturando…';
  await fetch('/api/miniaturas', { method: 'POST' });
  await cargar();
  e.target.disabled = false;
  e.target.textContent = 'Actualizar miniaturas';
});

// Arranque en dos pasadas: primero la cache (instantaneo), despues lo local,
// y el fetch al remoto al final sin bloquear nada.
(async function arrancar() {
  try {
    const cache = await (await fetch('/api/cache')).json();
    if (!cache.vacia) dibujar(cache);
  } catch { /* sin cache: se dibuja directo con lo local */ }

  await cargar();
  cargar({ conFetch: true }).catch(() => {});
})();
