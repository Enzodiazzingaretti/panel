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

function botones(p) {
  const b = [];
  b.push(`<button data-accion="claude">Claude</button>`);
  b.push(`<button data-accion="vscode">VS Code</button>`);
  if (p.scriptDev) b.push(`<button data-accion="dev">Dev</button>`);
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
        <div class="botones">${botones(p)}</div>
      </div>
    </article>`;
}

function dibujar(datos) {
  $('#maquina').textContent = `${datos.maquina.hostname} · ${datos.proyectos.length} proyectos`;

  $('#alertas').innerHTML = (datos.alertas ?? [])
    .map(a => `<div class="aviso ${a.severidad}"><span class="marca">${MARCA[a.severidad]}</span><span>${a.texto}</span></div>`)
    .join('');

  $('#grilla').innerHTML = datos.proyectos.map(tarjeta).join('');

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

$('#grilla').addEventListener('click', (e) => {
  const boton = e.target.closest('button[data-accion]');
  if (!boton) return;
  const proyecto = boton.closest('.tarjeta').dataset.proyecto;
  accion(proyecto, boton.dataset.accion, boton.dataset.bat);
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
