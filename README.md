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

`config.json` tiene un bloque por máquina con las rutas de los repos y de la bóveda.
La primera vez que se abre en una máquina nueva se autoconfigura probando las rutas de
`candidatos` y se escribe solo.

El bloque `proyectos` mapea cada carpeta a su ficha en la bóveda y su URL de
producción, porque los nombres no coinciden (`Aurora` es la ficha
`aurora-cecilia-hospedajes`).
