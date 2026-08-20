# Panel

**A local dashboard for every project on a machine — git status, production thumbnails, and a list of what's out of sync.** Zero dependencies, opens with a double click.

---

## Why

I work across a desktop and a laptop. The failure mode isn't dramatic — it's opening a project three weeks later and not remembering whether the local branch was ahead, whether the deployed site matched the code, or whether that client's invoice was ever paid.

So the panel answers those questions before I ask them. It scans the project folders on the current machine and surfaces what's *wrong*:

- commits on the remote I haven't pulled
- notes in the vault older than the code they describe
- overdue invoices
- leftover branches
- which machine I'm currently sitting at

## No dependencies, on purpose

There is no `npm install`. The whole thing is plain Node plus Microsoft Edge, which ships with Windows.

A tool I open every morning shouldn't rot. A `node_modules` tree is a maintenance surface — audit warnings, breaking majors, a lockfile that goes stale — and none of that buys anything here. The cost is writing a bit more by hand; the payoff is that it still runs untouched a year from now.

Tests run on the built-in runner:

```bash
node --test tests/
```

## Self-configuring across machines

`config.json` holds one block per machine, each with a label and the paths to its repos and vault. First launch on a new machine probes the candidate paths, works out where things live, and writes itself.

That's not over-engineering — it's the difference in the folder layouts. On the laptop the repo folder is `Documents` in its entirety, sitting alongside Ableton, rekordbox and ten other folders that aren't projects. So the panel lists only directories that are actual git repos, plus whatever is declared explicitly in `proyectos`.

The `proyectos` block also maps each folder to its vault note and production URL, because the names don't match: the `Aurora` folder is the note `aurora-cecilia-hospedajes`.

The machine label is what the header shows, so a glance tells you where you are — *Notebook · DESKTOP-9BH2BPQ · 9 projects*. Missing label falls back to the hostname.

---

## Requirements

Node 18+ and Microsoft Edge. Nothing else.

## Running

Double-click `Panel.bat`, or:

```bash
node server.mjs
```

Then open <http://127.0.0.1:4321>.

## Desktop shortcut

Run once:

```bash
powershell -ExecutionPolicy Bypass -File Crear-Acceso-Directo.ps1
```

Leaves a `Panel.lnk` on the desktop.

## On a second machine

```bash
git clone https://github.com/Enzodiazzingaretti/panel
cd panel
powershell -ExecutionPolicy Bypass -File Crear-Acceso-Directo.ps1
```

First launch detects that machine's paths and writes itself into `config.json`. Worth committing that change afterwards.

## Structure

```
server.mjs           # HTTP server
lib/
├── maquina.mjs      # machine detection and labelling
├── repos.mjs        # git scanning
├── proyectos.mjs    # project registry
├── boveda.mjs       # vault notes
├── finanzas.mjs     # invoices
├── alertas.mjs      # out-of-sync detection
├── miniaturas.mjs   # production thumbnails
├── dev.mjs          # start/stop dev servers
├── acciones.mjs
└── cache.mjs
tests/               # node --test
```

---

<details>
<summary><b>🇦🇷 Español</b></summary>

<br>

**Panel local de todos los proyectos de una máquina — estado de git, miniaturas de producción y una lista de lo que está desincronizado.** Sin dependencias, se abre con doble clic.

## Por qué

Trabajo entre una desktop y una notebook. El problema no es dramático: es abrir un proyecto tres semanas después y no acordarse si la rama local estaba adelantada, si el sitio deployado coincidía con el código, o si esa factura del cliente se llegó a cobrar.

Entonces el panel contesta esas preguntas antes de que las haga. Recorre las carpetas de proyectos de la máquina actual y muestra lo que está *mal*:

- commits en el remoto que no traje
- fichas de la bóveda más viejas que el código que describen
- facturas vencidas
- ramas sobrantes
- en qué máquina estoy parado

## Sin dependencias, a propósito

No hay `npm install`. Es Node pelado más Microsoft Edge, que viene con Windows.

Una herramienta que abro todas las mañanas no debería pudrirse. Un árbol de `node_modules` es superficie de mantenimiento — warnings de auditoría, majors que rompen, un lockfile que envejece — y nada de eso compra nada acá. El costo es escribir un poco más a mano; el beneficio es que dentro de un año sigue corriendo sin que lo toque.

Los tests corren con el runner incorporado:

```bash
node --test tests/
```

## Se autoconfigura entre máquinas

`config.json` tiene un bloque por máquina, cada uno con su etiqueta y las rutas de sus repos y de la bóveda. La primera vez que se abre en una máquina nueva prueba las rutas candidatas, deduce dónde está cada cosa y se escribe solo.

No es sobreingeniería — es la diferencia real entre los layouts de carpetas. En la notebook la carpeta de repos es `Documents` entera, conviviendo con Ableton, rekordbox y otras diez carpetas que no son proyectos. Por eso el panel lista solo los directorios que son repos de git de verdad, más lo que esté declarado explícitamente en `proyectos`.

El bloque `proyectos` además mapea cada carpeta a su ficha en la bóveda y su URL de producción, porque los nombres no coinciden: la carpeta `Aurora` es la ficha `aurora-cecilia-hospedajes`.

La etiqueta de máquina es lo que muestra el encabezado, para que de un vistazo se vea dónde estás parado — *Notebook · DESKTOP-9BH2BPQ · 9 proyectos*. Si falta, usa el hostname.

## Requisitos

Node 18 o superior y Microsoft Edge. Nada más.

## Correr

Doble clic en `Panel.bat`, o:

```bash
node server.mjs
```

Después abrir <http://127.0.0.1:4321>.

## Acceso directo en el escritorio

Correr una vez:

```bash
powershell -ExecutionPolicy Bypass -File Crear-Acceso-Directo.ps1
```

Deja un `Panel.lnk` en el escritorio.

## En la notebook

```bash
git clone https://github.com/Enzodiazzingaretti/panel
cd panel
powershell -ExecutionPolicy Bypass -File Crear-Acceso-Directo.ps1
```

La primera vez que se abre detecta las rutas de esa máquina y se escribe solo en `config.json`. Después conviene commitear ese cambio.

</details>
