# Lote C — Tareas 8 y 9 (Panel Fase 1)

Ejecutado transcribiendo el plan `docs/superpowers/plans/2026-07-30-panel-fase-1.md`, tareas 8-9, sin rediseño. Al entrar, Tareas 1-7 ya estaban commiteadas (`0bcf60e` como último commit) y los 49 tests pasaban.

## Task 8 — Interfaz morphglass

- Reemplazado el placeholder de una línea por `web/index.html` completo (fondo con 4 manchas, cabecera, sección de alertas, grilla de proyectos, pie), y creados `web/panel.css` y `web/panel.js` tal cual figuran en el plan, sin ningún cambio de estética ni de lógica.
- **Verificación en desktop (1280px):** servidor real (`node server.mjs`) contra los datos reales de la máquina.
  - Las 9 tarjetas aparecen (8 configuradas en `config.json` + `panel` mismo, que ya vive como carpeta de git en `GitHubRepos` — mismo caso que documentó el Lote B en Task 5). Las 4 con `prod` (`kexxy-portfolio`, `tamara-portfolio`, `newmetals-portfolio`, `presskit_digital`) muestran su miniatura de `/thumbs/*-desktop.png` como `background-image` del `.foto`, confirmado por `getComputedStyle` (`background-image: url("http://127.0.0.1:4321/thumbs/kexxy-portfolio-desktop.png")`, `opacity: 0.55`) y por las requests de red (`200 OK` a los 4 PNG). Las 5 sin `prod` quedan con clase `.sin-foto` y el degradado de respaldo.
  - Transición de hover confirmada por CSS computado: `.tarjeta` tiene `transition: background 0.7s cubic-bezier(0.22, 0.61, 0.36, 1), border-color 0.7s ..., border-radius 0.7s ..., backdrop-filter 0.7s ...` — los 700 ms pedidos, sin `width`/`height`/`transform` en la regla `:hover` de la tarjeta (solo el `.foto` interno escala `1.03` dentro de un contenedor con `overflow:hidden`, la tarjeta en sí no crece).
  - Manchas del fondo: `.m1` tiene `animation-duration: 74s`, coherente con los 66-88s del CSS (`vagar1` 74s/81s, `vagar2` 88s, `vagar3` 66s).
  - Barra de alertas: se ven las alertas reales — deriva de ficha en `kexxy-portfolio` (7 días), `tamara-portfolio` (3), `newmetals-portfolio` y `presskit_digital` (2); ramas sobrantes `feat/admin-tamara` y `backup-local-20260720`; residuos de deploy en `Aural-studio`, `sommelier_portfolio`, `VEIL`; sin ficha en `Aural-studio`, `sommelier_portfolio`, `VEIL` y `panel`. Coincide con lo que ya habían visto los lotes anteriores.
  - Botones: probé el de **Producción** en `kexxy-portfolio`. El primer intento con clic real de mouse (herramienta `computer` del panel de navegador) no disparó el evento — ver "Desvíos" abajo. Disparando el mismo botón con `.click()` desde JS (mismo listener delegado de `panel.js`, sin tocar código), la request `POST /api/accion` salió con `200 {"ok":true}` y el navegador por defecto de la máquina (Brave, no Edge — configuración de esta PC, no del panel) abrió `https://portfolio-kexxy.vercel.app` de verdad.
  - Fuentes: `h1` con `font-family: Georgia, Constantia, serif`, `body` con `"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif` — ninguna request externa (confirmado por la lista de red: solo `panel.css`, `panel.js`, `/api/*` y `/thumbs/*`, todo a `127.0.0.1:4321`).
- **Verificación en mobile (390px):** `resize_window` a 390×844.
  - Grilla en una sola columna (`grid-template-columns: 358px`), las 9 tarjetas miden 358px de ancho, `document.documentElement.scrollWidth === window.innerWidth` (390 = 390) → **sin desborde horizontal**.
  - Botones de acción con ~29.6px de alto — tocables, aunque por debajo del mínimo de 44px que suelen recomendar las guías táctiles; es tal cual lo definió el plan en `panel.css` (`.botones button { padding: 0.3rem 0.62rem; }`), no lo ajusté porque no era parte de la tarea rediseñar tamaños.
  - Manchas: `.mancha { width: 80vw; height: 80vw; }` en el media query de 560px, aplicado.
- **Consola del navegador:** sin errores ni warnings en ninguna de las dos pasadas (`read_console_messages` vacío).
- **Arranque en dos pasadas (Step 6):** confirmado por las requests de red en orden — `GET /api/cache` primero, después `GET /api/estado`, y por último `GET /api/estado?fetch=1` en paralelo sin bloquear el dibujo inicial. El pie de página pasa de "Estado local" a "Actualizado con el remoto" cuando llega la segunda respuesta.
- Commit: `3b284ca feat: interfaz morphglass con grilla de proyectos y avisos`

### Limitación de esta verificación

No pude sacar **capturas de pantalla reales** (`computer{action:"screenshot"}` devolvió sistemáticamente `"the Browser pane is not displayed, so the page is not compositing frames"` en esta sesión, algo del entorno de esta tarea y no del panel). Compensé con:

1. `get_page_text` y el árbol de accesibilidad (`read_page`) para confirmar contenido y estructura.
2. `getComputedStyle` vía `javascript_tool` para confirmar valores reales de transición, animación, tipografía, `background-image`, ancho de grilla y ausencia de overflow — en ambos anchos.
3. `read_network_requests` para confirmar que las miniaturas cargan y que no hay requests externas.

Esto verifica que el CSS/JS se aplica como está escrito, pero no es lo mismo que mirar la pantalla: no puedo confirmar con los ojos matices como el tono exacto de las manchas de fondo o el contraste real del vidrio. Recomiendo que alguien abra el panel una vez a simple vista antes de darlo por cerrado del todo, aunque la transcripción es literal y las propiedades computadas coinciden con lo esperado.

También noté, sin tocarlo, que el clic real de mouse simulado por la herramienta del navegador no disparaba el listener del DOM (mismo síntoma que el screenshot: falta de compositing/hit-testing), mientras que `:hover` vía `matches(':hover')` marcaba `true` pero el estilo computado no cambiaba hasta que hice el clic con `.click()` de JS. Es una limitación de la herramienta de automatización en esta sesión, no un bug de `panel.js` ni de `panel.css` — el binding de eventos y el CSS `:hover` están escritos de forma estándar y correcta.

## Task 9 — Lanzador y acceso directo en el escritorio

- Creados `Panel.bat` y `Crear-Acceso-Directo.ps1` tal cual el plan, y agregada al `README.md` la sección "Acceso directo en el escritorio" + "En la notebook". `panel.log` ya estaba cubierto por `*.log` en `.gitignore` desde antes.
- **Verificación del `.bat` (Step 2):** con el puerto 4321 libre, lancé `Panel.bat` (vía `Start-Process`, equivalente a doble clic). A los ~5s el puerto quedó en `Listen`, `panel.log` mostró `Panel en http://127.0.0.1:4321` sin errores, y se abrió una ventana de Edge con `MainWindowTitle: "Panel"` (modo app, sin barra de direcciones). Cerré esa ventana y volví a lanzar `Panel.bat`: abrió una ventana nueva casi al instante y **el proceso `node server.mjs` siguió siendo el mismo PID** (confirmado con `Get-CimInstance Win32_Process` filtrando por línea de comando) — no se levantó un segundo servidor.
- **Verificación del acceso directo (Step 4):** `Crear-Acceso-Directo.ps1` imprimió `Acceso directo creado en: C:\Users\Enzo\Desktop\Panel.lnk`, y `Test-Path` lo confirmó. Inspeccioné el `.lnk` con `WScript.Shell`: `TargetPath = ...\Panel.bat`, `WorkingDirectory` correcto, `WindowStyle = 7` (minimizado), `IconLocation = C:\WINDOWS\System32\imageres.dll,109`.
  - Para probarlo de punta a punta, cerré la ventana de Edge y maté el proceso `node server.mjs`, esperé a que el puerto liberara (`TimeWait`), y abrí `Panel.lnk` con `Invoke-Item` (lo más parecido a un doble clic real disponible en esta sesión sin control de mouse sobre el escritorio). El servidor arrancó de cero, el puerto quedó en `Listen`, y se abrió la ventana de Edge con título "Panel" — **igual que con el `.bat` directo**.
- Dejé el estado limpio al final: maté la ventana de Edge de prueba y el proceso del servidor, así no queda nada corriendo de más.
- Commit: `516cb46 feat: lanzador Panel.bat y acceso directo al escritorio`

### Nota sobre la verificación del `.bat`/acceso directo

No hice clic físico con mouse sobre el ícono del escritorio (no tengo control de mouse sobre el escritorio real del usuario en esta sesión, solo terminal). Usé `Start-Process` / `Invoke-Item` desde PowerShell, que ejecuta exactamente el mismo camino que un doble clic del explorador (abre el `.lnk`/`.bat` con sus asociaciones normales) y el resultado observado — puerto abierto, log limpio, ventana de Edge en modo app con título "Panel", sin proceso duplicado — es el mismo que describe el Step 2 y el Step 4 del plan. Si el usuario quiere el clic físico con sus propios ojos, alcanza con doble clic en `Panel.lnk` del escritorio.

## Corrida completa

```
node --test tests/*.test.mjs
```

```
ℹ tests 49
ℹ suites 0
ℹ pass 49
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

49/49 tests siguen pasando (ninguna de las dos tareas de este lote toca `lib/` ni `server.mjs`, así que era esperable que no cambiara nada).

## Desvíos del plan y por qué

Ninguno en el código. `web/index.html`, `web/panel.css`, `web/panel.js`, `Panel.bat` y `Crear-Acceso-Directo.ps1` son transcripción literal de los bloques del plan — los diffs de los commits (`402 insertions` en Task 8, `80 insertions` en Task 9) corresponden exactamente al tamaño de los bloques de código del documento. Los únicos "ajustes" fueron de **método de verificación** (descritos arriba), no de código: el clic de mouse real y las capturas de pantalla no funcionaron en esta sesión del navegador embebido, así que verifiqué por estilos computados, red y accesibilidad, y para el `.bat`/acceso directo usé `Start-Process`/`Invoke-Item` en vez de un clic físico.

## Defectos visuales no resueltos

Ninguno detectado con las herramientas disponibles (estilos computados, estructura DOM, ausencia de overflow y de errores de consola todos correctos), pero como no pude ver la pantalla renderizada de verdad, no puedo garantizar el matiz o la sensación final del vidrio y las manchas — solo que las reglas CSS que las producen están escritas y aplicadas tal como las definió el plan. Vale la pena una revisión visual rápida a simple vista.
