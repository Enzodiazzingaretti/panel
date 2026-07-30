# Panel local de proyectos y bóveda

Panel que se abre con doble clic (`Panel.bat` o el acceso directo del escritorio) y
muestra los proyectos de esta máquina con miniatura de producción, estado de git y una
barra de avisos de lo que está desincronizado.

## Memoria del proyecto

El contexto completo vive en la bóveda, en `10-proyectos\panel-local\`:

- `panel-local.md` — estado actual, stack, estructura, qué avisa, bugs conocidos
- `panel-local-tareas.md` — pendientes reales y las fases que faltan
- `decisiones\` — qué se decidió y por qué se descartaron las alternativas

Y el diseño completo en `docs\superpowers\specs\2026-07-30-panel-local-design.md`
de la bóveda. El plan de implementación está en este repo, en
`docs\superpowers\plans\`.

Antes de tocar diseño o texto, leé también
`30-notas\workflows\preferencias-de-trabajo.md`.

> [!important] La ruta de la bóveda depende de la máquina
> PC principal: `D:\Drive\boveda` · Notebook: `G:\My Drive\boveda`.
> La que corresponde está en `config.json`, bajo la entrada de esta máquina. Ver
> `30-notas\workflows\entorno-de-trabajo.md` de la bóveda.

## Reglas específicas de este repo

- **Cero dependencias. Nunca `npm install`.** Solo librería estándar de Node y CSS/JS
  nativo, sin build. El panel tiene que arrancar al instante: si tarda en abrir, se deja
  de abrir. Las capturas usan Edge headless (ya viene con Windows) para no traer
  Playwright.
- **El servidor escucha solo en `127.0.0.1`.** Nunca en `0.0.0.0`.
- **Ningún comando se arma con texto libre del cliente.** El navegador manda un id de
  carpeta y un nombre de acción de una lista cerrada; el servidor valida que la carpeta
  sea un directorio real dentro de la carpeta de repos y arma el comando desde
  `config.json`. Es un requisito de seguridad, no un detalle de estilo.
- **La Fase 1 no escribe en la bóveda.** Los únicos archivos que el código escribe son
  `cache.json`, `config.json` y los de `thumbs\`. La escritura en la bóveda es la Fase 2
  y tiene su propio contrato en el spec.
- **Una sola rama `main`.** `git pull` antes de asumir el estado — se trabaja desde dos
  máquinas.
- **Todo cambio visual se revisa en desktop y en mobile** antes de darlo por bueno.
- Textos de la interfaz en español, y que no suenen a IA.

## Comandos

```
Panel.bat                          abrir
Diagnostico.bat                    volcar el estado a diagnostico.txt (para pedir ayuda)
node server.mjs                    levantar a mano y ver los errores
node --test tests/*.test.mjs       correr los tests
```

> [!warning] Dos trampas conocidas
> **1.** `node --test tests/` falla si la ruta del repo tiene un espacio (como
> `D:\Disco D\`). Hay que pasar el glob: `node --test tests/*.test.mjs`.
>
> **2.** El servidor lee `config.json` **una sola vez al arrancar**, y `Panel.bat` reusa
> el que ya está corriendo. Después de tocar la config hay que matar el proceso de node,
> o vas a estar midiendo contra el servidor viejo.

## Cómo se mapean los proyectos

`config.json` mapea cada **carpeta** a su ficha de la bóveda y su URL de producción.
El nombre de la carpeta **no** coincide siempre con el de la ficha ni con el del repo:

| Carpeta (PC principal) | Carpeta (notebook) | Ficha |
|---|---|---|
| `Aurora` | `aurora-retreat` | `aurora-cecilia-hospedajes` |
| `Aural-studio` | `creative-agency-template` | — |
| `sommelier_portfolio` | `sommelier-portfolio` | — |
| `VEIL` | `veil` | — |
| `presskit_digital` | `presskit_digital` | `presskit-digital` |
| `panel` | `panel` | `panel-local` |

Las diferencias por máquina se resuelven con `alias` en `config.json`, y la búsqueda
ignora mayúsculas. Si aparece una carpeta que no está en el mapa, el panel la muestra
igual, marcada como *sin configurar*.

## Al terminar

Si se resolvió algo que costó tiempo, se tomó una decisión relevante o cambió el estado
del proyecto, proponé registrarlo en la bóveda antes de cerrar.
