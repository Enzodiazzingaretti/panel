# Panel

Panel local de proyectos y bóveda. Se abre con doble clic en `Panel.bat`.

Muestra los proyectos de esta máquina con miniatura de producción y estado de git,
y avisa de lo que está desincronizado: commits sin traer, fichas de la bóveda más
viejas que el código, facturas vencidas, ramas sobrantes.

## Requisitos

Node 18 o superior y Microsoft Edge (viene con Windows). **Sin dependencias**: no hay
`npm install`.

## Correr

Doble clic en `Panel.bat`, o desde la terminal:

    node server.mjs

Después abrir http://127.0.0.1:4321

## Pruebas

    node --test tests/

## Configuración

`config.json` tiene un bloque por máquina con su `etiqueta` y las rutas de los repos y
de la bóveda. La etiqueta es lo que el encabezado muestra para que se vea de un vistazo
dónde estás parado —*Notebook · DESKTOP-9BH2BPQ · 9 proyectos*—; si falta, usa el
hostname. La primera vez que se abre en una máquina nueva se autoconfigura probando las
rutas de `candidatos` y se escribe solo.

Se listan solo las carpetas que son repos de git, más las declaradas en `proyectos`. Hace
falta porque en la notebook la carpeta de repos es `C:\Users\Enzo\Documents` entera, con
Ableton, rekordbox y otras diez carpetas que no son proyectos.

El bloque `proyectos` mapea cada carpeta a su ficha en la bóveda y su URL de
producción, porque los nombres no coinciden (`Aurora` es la ficha
`aurora-cecilia-hospedajes`).

## Acceso directo en el escritorio

Correr una vez:

    powershell -ExecutionPolicy Bypass -File Crear-Acceso-Directo.ps1

Deja un `Panel.lnk` en el escritorio que abre el panel con doble clic.

## En la notebook

    git clone https://github.com/enzodiazzingaretti27-design/panel
    cd panel
    powershell -ExecutionPolicy Bypass -File Crear-Acceso-Directo.ps1

La primera vez que se abre detecta las rutas de esa máquina y se escribe solo en
`config.json`. Después conviene commitear ese cambio.
