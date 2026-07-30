# Lote A — Tareas 1 a 4 (Panel Fase 1)

Ejecutado transcribiendo el plan `docs/superpowers/plans/2026-07-30-panel-fase-1.md`, tareas 1-4, sin rediseño. Todos los pasos de cada tarea se siguieron en orden (test que falla → implementación → test que pasa → verificación contra datos reales cuando aplica → commit).

## Task 1 — Repo, configuración y resolución de máquina

- `git init -b main` en `D:\Disco D\GitHubRepos\panel`, commit inicial con el plan ya presente en `docs/`.
- Creados: `.gitignore`, `config.json` (hostname `DESKTOP-HM0V74B`, candidatos, mapa de 8 proyectos), `lib/maquina.mjs` (`cargarConfig`, `resolverMaquina`, `guardarMaquina`), `README.md`.
- Test `tests/maquina.test.mjs`: falló primero con `Cannot find module '../lib/maquina.mjs'` (esperado), después de implementar pasó completo.
- **Resultado: 4/4 tests PASA.**
- Commit: `48883cb feat: config y resolucion de maquina por hostname`

## Task 2 — Lectura del estado de git

- Creado `lib/repos.mjs` con `leerRepo`, `leerTodos`, `fetchTodos`, incluida la detección de residuos (`netlify.toml`, rama remota `gh-pages`, workflow de gh-pages).
- Test `tests/repos.test.mjs` (crea repos git reales en carpetas temporales): falló primero con `Cannot find module '../lib/repos.mjs'` (esperado).
- **Resultado: 10/10 tests PASA.**
- **Verificación contra repos reales (Step 5)** corriendo `leerTodos` sobre `kexxy-portfolio`, `presskit_digital`, `VEIL` en `D:\Disco D\GitHubRepos`:
  - Los tres con `esRepo: true`, `rama: "main"`, `adelante: 0`, `atras: 0` — coincide con lo esperado.
  - `presskit_digital` con `ramasExtra: ["backup-local-20260720"]` — coincide.
  - `VEIL` con `residuos: ["gh-pages"]` (rama remota) — consistente con lo que el plan anticipa para Task 5.
  - Dato adicional no contradictorio con el plan: `kexxy-portfolio` tiene `sucios: 3` y `presskit_digital` `sucios: 2` (archivos sin commitear reales en este momento, no evaluado por el plan en este paso).
- Commit: `1b30f7d feat: lectura del estado de git por repo`

## Task 3 — Lectura de fichas de la bóveda

- Creados fixtures `tests/fixtures/ficha-completa.md` y `tests/fixtures/ficha-minima.md`, y `lib/boveda.mjs` con `parsearFrontmatter`, `parsearFicha`, `leerFicha`, `contarSesionesSinDestilar`.
- Test `tests/boveda.test.mjs`: falló primero con `Cannot find module '../lib/boveda.mjs'` (esperado).
- **Resultado: 6/6 tests PASA.**
- **Verificación contra la bóveda real (Step 6)** leyendo `kexxy-portfolio`, `aurora-cecilia-hospedajes`, `tamara-portfolio` desde `D:\Drive\boveda`:
  - Las tres devuelven `titulo`, `estado: "activo"`, `stack` poblado y `actualizado` con fecha real (`2026-07-21`, `2026-07-21`, `2026-07-25` respectivamente).
  - `aurora-cecilia-hospedajes` con `cliente: "cecilia"` — coincide exactamente con lo esperado por el plan.
- Commit: `de321e1 feat: lectura de fichas de proyecto de la boveda`

## Task 4 — Reglas de alertas

- Creado `lib/alertas.mjs` con `calcularAlertas` y la constante `DIAS_DERIVA_FICHA = 2`.
- Test `tests/alertas.test.mjs`: falló primero con `Cannot find module '../lib/alertas.mjs'` (esperado).
- **Resultado: 11/11 tests PASA.**
- Commit: `1285468 feat: reglas de alertas de salud de proyectos`

## Corrida completa

```
node --test tests/*.test.mjs
```

```
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

31/31 tests pasan (4 + 10 + 6 + 11), tal como esperaba el plan.

## Desvíos del plan

Ninguno en el código: todos los módulos, tests y fixtures se transcribieron tal cual figuran en el plan y pasaron sin necesitar ajustes.

Un solo hallazgo de entorno, no de código, que conviene que sepan las tareas siguientes (Task 5 en particular, que agrega `tests/servidor.test.mjs`):

- **`node --test tests/` (pasando el directorio) falla** en esta máquina con `Error: Cannot find module 'D:\Disco D\GitHubRepos\panel\tests'` / `MODULE_NOT_FOUND`, tanto desde Git Bash como desde PowerShell. Parece un problema de Node 24.16.0 resolviendo el argumento de directorio como módulo cuando la ruta tiene un espacio (`Disco D`). La forma que sí funciona de forma confiable es pasar un glob explícito de archivos: `node --test tests/*.test.mjs` (o listar cada archivo). El `README.md` documenta `node --test tests/` tal como lo pide el plan (Task 1, Step 8) — se dejó así porque es texto literal del plan, pero en la práctica en esta máquina hay que usar la forma con glob. Vale la pena que quien continúe con Task 5+ corra los tests de `servidor.test.mjs` con `node --test tests/servidor.test.mjs` (como indica el propio plan paso a paso) y, si en algún momento se agrega un script `npm test` o similar en un `.bat`, que use el glob en vez del directorio pelado.

## Notas para las tareas siguientes

- El hostname de esta máquina configurado en `config.json` (`DESKTOP-HM0V74B`) ya resuelve correctamente `repos` y `boveda` — no se disparó el flujo de autoregistro (`nueva: true`) en ningún punto de esta corrida real.
- `kexxy-portfolio` y `presskit_digital` tienen archivos sin commitear en este momento (3 y 2 respectivamente) — no es un bug, es el estado real del working tree; si Task 5+ hace verificaciones a mano contra el estado real, van a ver `sucios > 0` ahí y alertas de severidad `baja` por eso.
- `VEIL` ya tiene el residuo `gh-pages` detectado como rama remota, consistente con lo que Task 5 (Step 6) espera ver en el endpoint `/api/estado`.
- Todos los commits quedaron en `main`, sin ramas adicionales, con mensajes en español y el prefijo `feat:`/`chore:` según correspondía.
