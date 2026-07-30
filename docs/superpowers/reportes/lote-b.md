# Lote B — Tareas 5 a 7 (Panel Fase 1)

Ejecutado transcribiendo el plan `docs/superpowers/plans/2026-07-30-panel-fase-1.md`, tareas 5-7, sin rediseño. Todos los pasos de cada tarea se siguieron en orden (test que falla → implementación → test que pasa → verificación contra datos reales → commit).

## Task 5 — Servidor y caché

- Creados `lib/cache.mjs` (`leerCache`, `escribirCache`) y `server.mjs` (`crearServidor`, endpoints `GET /api/estado`, `GET /api/estado?fetch=1`, `GET /api/cache`, estáticos desde `web/` y `thumbs/`), y `web/index.html` provisorio (placeholder pedido por el propio Step 5).
- Test `tests/servidor.test.mjs`: falló primero con `Cannot find module '../server.mjs'` (esperado).
- **Resultado: 4/4 tests PASA.**
- **Verificación contra datos reales (Step 6):** `node server.mjs` + `curl http://127.0.0.1:4321/api/estado`.
  - Alertas reales confirmadas tal como anticipa el plan: deriva de ficha en `kexxy-portfolio` (7 días), `tamara-portfolio` (3), `newmetals-portfolio` y `presskit_digital` (2); sin ficha en `Aural-studio`, `sommelier_portfolio`, `VEIL`; rama sobrante `feat/admin-tamara` (tamara-portfolio) y `backup-local-20260720` (presskit_digital); residuo de deploy `gh-pages` en `VEIL` y workflow de gh-pages en `Aural-studio`.
  - **Desvío frente al número exacto del plan:** el endpoint devolvió `proyectos: 9`, no 8. La diferencia es el propio repo `panel`, que ya vive como carpeta de git dentro de `D:\Disco D\GitHubRepos` (se creó en la Task 1 de este mismo proyecto) y no está en la lista cerrada de `config.proyectos`, así que `armarEstado` lo suma como proyecto "en disco" — comportamiento correcto de la función, el "8" del plan es anterior a que `panel` mismo existiera en esa carpeta. `panel` aparece con alertas `sin ficha en la boveda` y `N archivos sin commitear`, coherente con su estado real.
- Commit: `8e53b06 feat: servidor http local con endpoint de estado y cache`

## Task 6 — Acciones de los botones

- Creado `lib/acciones.mjs` (`ACCIONES`, `armarComando`, `ejecutarAccion`) y agregado `POST /api/accion` a `server.mjs`, validando `proyecto` contra `config.json`, `accion` contra la lista cerrada y `bat` contra los `.bat` reales del repo.
- Test `tests/acciones.test.mjs`: falló primero con `Cannot find module '../lib/acciones.mjs'` (esperado).
- **Resultado: 9/9 tests PASA.**
- **Verificación a mano (Step 6):** `node server.mjs` +
  - `POST /api/accion {proyecto: kexxy-portfolio, accion: prod}` → `{"ok":true}`, se abrió `https://portfolio-kexxy.vercel.app` en el navegador por defecto (comando `cmd /c start` detached).
  - `POST /api/accion {proyecto: kexxy-portfolio, accion: rm-rf}` → `{"error":"Accion no permitida: rm-rf"}`, nada se ejecutó.
- Commit: `8ad6eab feat: acciones de proyecto desde lista cerrada`

## Task 7 — Miniaturas con Edge headless

- Creados `lib/miniaturas.mjs` (`rutaEdge`, `elegirMiniatura`, `capturar`, `capturarTodas`, `listarThumbs`) y `thumbs/.gitkeep`; agregado `POST /api/miniaturas` a `server.mjs`; `.gitignore` actualizado (`thumbs/*-desktop.png`, `thumbs/*-mobile.png` en vez de `thumbs/*.webp`).
- Test `tests/miniaturas.test.mjs`: falló primero con `Cannot find module '../lib/miniaturas.mjs'` (esperado).
- **Resultado: 5/5 tests PASA** (incluye `encuentra Edge en esta maquina`, que confirmó Edge instalado en `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`).
- **Verificación de captura real (Step 6) — con un ajuste de entorno, ver "Desvíos" abajo:** `capturarTodas(config, thumbs)` devolvió `capturadas: [kexxy-portfolio, tamara-portfolio, newmetals-portfolio, presskit_digital]`, `omitidas: [Aurora, Aural-studio, sommelier_portfolio, VEIL]` — exactamente lo que anticipa el plan. Se generaron los 8 PNG esperados (`*-desktop.png` y `*-mobile.png` para los 4 proyectos con `prod`).
  - **Las miniaturas se capturaron bien, no en blanco**, confirmado abriendo los PNG: `kexxy-portfolio`, `tamara-portfolio`, `newmetals-portfolio` y `presskit_digital` muestran el sitio real (hero, textos, imágenes), no pantallas blancas.
- **Verificación del endpoint con miniaturas (Step 8):** `node server.mjs` + `curl /api/estado` → los 4 proyectos con `prod` devuelven `miniatura: "<nombre>-desktop.png"`, el resto (`Aurora`, `Aural-studio`, `sommelier_portfolio`, `VEIL`, `panel`) devuelve `null`. `curl -I http://127.0.0.1:4321/thumbs/kexxy-portfolio-desktop.png` → `200`.
- Commit: `0bcf60e feat: capturas de produccion con Edge headless`

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

49/49 tests pasan (31 previos + 4 + 9 + 5 de este lote), tal como esperaba el plan.

## Desvíos del plan y por qué

1. **`virtual-time-budget` subido de 6000 a 12000 en `lib/miniaturas.mjs`.** En la primera corrida real de `capturarTodas`, `kexxy-portfolio-desktop.png` salió con la pantalla de precarga del sitio ("028% LOADING ASSET MANIFEST...") en vez del contenido real — no estaba en blanco, pero tampoco mostraba el sitio. El propio plan autoriza este ajuste explícitamente ("si sale blanco, subir `--virtual-time-budget`"), y la instrucción de esta tarea lo confirma. Se subió la constante a `12000` y se volvió a capturar: las 4 miniaturas quedaron correctas. Es el único cambio de código que no es transcripción literal del plan; todo lo demás en `lib/miniaturas.mjs` es tal cual figura en el documento.
2. **Ruta relativa vs. absoluta al invocar `capturarTodas` para la verificación manual.** El comando de verificación que da el plan (Step 6) es `m.capturarTodas(c,'./thumbs')`, con ruta relativa. En esta máquina, Edge headless con `--screenshot=<ruta relativa>` falla silenciosamente (`Failed to write file ...: El sistema no puede encontrar la ruta especificada`) sin importar el formato (con o sin `./`, con `/` o `\`) — solo escribe si la ruta es absoluta. No es un bug del código: `server.mjs` siempre invoca `capturarTodas(config, thumbs)` con `thumbs = join(raiz, 'thumbs')`, que ya es absoluta, así que el uso real en producción no se ve afectado. Para la verificación manual usé `resolve('./thumbs')` en vez de la ruta relativa literal del plan, solo para que el chequeo reflejara lo que realmente hace el servidor. `lib/miniaturas.mjs` no se tocó por este punto — sigue transcripto tal cual.
3. **`proyectos: 9` en vez de `8` en la verificación de Task 5 (Step 6).** Ver detalle arriba: no es un desvío de código, es que `panel` ahora existe como carpeta git en `D:\Disco D\GitHubRepos` (no existía cuando se escribió ese número en el plan).
4. **"Actualizar las dos llamadas a `armarEstado`" (Task 7, Step 7) — solo hay una.** Reviso el código del propio plan (Task 5, Step 4) y el agregado de Task 7: `armarEstado` se define una sola vez y se invoca una sola vez, dentro del handler de `GET /api/estado`. No encontré un segundo call site ni en el plan ni en el código que fui transcribiendo. Actualicé la única llamada existente para pasar `thumbs`, dejando la firma y el uso consistentes. Marco esto para que quien siga sepa que la mención de "dos llamadas" en las instrucciones no se corresponde con el código real — no inventé una segunda llamada para no desviarme del plan.

Nada de esto tocó `lib/maquina.mjs`, `lib/repos.mjs`, `lib/boveda.mjs` ni `lib/alertas.mjs` (Tareas 1-4), que se consumieron tal cual estaban.

## Notas para la interfaz que viene (Task 8)

- El servidor sirve los PNG de `thumbs/` con `content-type: application/octet-stream`, no `image/png` — el mapa `TIPOS` del plan (Task 5, Step 4) solo define `.webp`, no `.png`, y las capturas de Edge headless son PNG (así lo aclara el propio plan en Task 7, Step 3: "Edge headless guarda PNG, no WebP"). En la práctica los navegadores suelen renderizar `<img>` igual por sniffing de contenido, pero si en Task 8 algo depende del `content-type` real de la imagen, esto es lo que hay.
- `p.miniatura` en `/api/estado` es solo el nombre de archivo (`"kexxy-portfolio-desktop.png"`), no la ruta completa — hay que armar `/thumbs/<miniatura>` en el frontend.
- `elegirMiniatura` da precedencia a `<nombre>-manual.webp/png/jpg` sobre `-desktop`; hoy no hay ninguna miniatura manual en el repo, así que todas las que se ven son automáticas.
- El endpoint `POST /api/miniaturas` dispara `capturarTodas` de nuevo (los 4 proyectos con `prod`, 8 archivos, ~1-2 minutos en total por los `--virtual-time-budget=12000` + tiempo de red) — vale la pena que el botón de refrescar miniaturas en la UI muestre algún estado de carga, porque no es instantáneo.
- Igual que en el Lote A: `node --test tests/` (con el directorio pelado) sigue sin funcionar en esta máquina por el espacio en la ruta; usar `node --test tests/*.test.mjs` o el archivo puntual.
- Todos los commits quedaron en `main`, sin ramas adicionales, con mensajes en español y prefijo `feat:` según correspondía.
