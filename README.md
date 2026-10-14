# ToBeDone - week&Goals Manager

Planificador semanal personal: semana tipo con bloques, tareas únicas que se ubican en los huecos libres, metas semanales y estadísticas. Funciona sin conexión y está preparado para sincronizar entre dispositivos con una base de datos.

## Uso

```bash
npm install
npm run dev       # servidor de desarrollo en http://localhost:5173
npm test          # tests de lógica, guardado y sincronización
npm run build     # versión final en dist/ (se puede subir tal cual a GitHub Pages)
```

`index.html` ya no se puede abrir con doble clic: usa módulos de JavaScript que necesitan `npm run dev` o el build de `dist/`.

## Funcionalidades

- **Ahora mismo**: el bloque en curso, cuánto falta y qué sigue.
- **Semana tipo**: grilla de lunes a domingo (vista por día en el celular) con filtro por categoría. Cada bloque tiene tips, se puede marcar como hecho, dar de baja esta semana, editar o eliminar.
- **Tareas**: tareas únicas con tiempo estimado, categoría y fecha límite. La app sugiere huecos libres o bloques liberados y las agenda en la grilla.
- **Metas de la semana**: contadores editables; cada lunes empieza una semana nueva.
- **Estadísticas**: cumplimiento por semana y por día, horas por área, metas y tareas completadas.
- **Primer mes de contenido**, **Tips** y tema claro/oscuro.

## Estructura

```
index.html            solo el HTML de la página
src/
  main.js             punto de entrada: conecta datos, lógica e interfaz
  styles/             CSS por sección (tokens y temas, grilla, tareas, metas, diálogos…)
  data/               contenido fijo: categorías, semana tipo, metas por defecto, plan de contenido y tips
  core/               utilidades sin dependencias: tiempo, reloj, escape de HTML, localStorage seguro
  domain/             reglas de negocio puras (sin DOM): huecos libres, sugerencias, validación, estadísticas
  state/              store con registros versionados, selectores memorizados y acciones (todas las escrituras)
  storage/            guardado local, migración de versiones viejas y sincronización con la base de datos
  ui/                 una pieza por sección de la pantalla; dibujan desde el estado y llaman acciones
tests/                tests de Vitest para core, domain, state y storage
docs/BASE_DE_DATOS.md cómo conectar una base de datos
```

El flujo es siempre el mismo: **la UI llama a una acción → la acción escribe en el store → el store avisa → se redibujan solo las secciones afectadas** y, en paralelo, se guarda la copia local y se encola el cambio para la base de datos.

### Optimizaciones respecto de la versión de un solo archivo

- Redibujado por secciones y agrupado en un solo cuadro de animación: marcar un bloque ya no redibuja toda la página varias veces.
- Un solo listener por contenedor (delegación de eventos) en lugar de uno por bloque, tarea o botón.
- Bloques por día, horas planificadas y listas ordenadas se calculan una vez por cambio (selectores memorizados).
- Cada minuto solo se mueve la línea de «ahora» y se actualiza lo que depende de la hora; la grilla completa se redibuja al cambiar de día.
- Las escrituras a localStorage se agrupan y se fuerzan al cerrar o esconder la página.
- La lógica no depende del DOM, así que se prueba con tests.

## Diseño

Estilo claro tipo Apple con neutros industriales (negro, grafito, gris, plata, blanco) y verde como acento. El tema claro es el predeterminado; el oscuro se activa con el botón de la barra superior.

- `src/styles/tokens.css`: toda la paleta, tipografía (San Francisco en Apple, Inter en el resto), radios y sombras. Para cambiar la apariencia, empezar por acá.
- Los colores de categoría están validados para que se distingan entre sí (también con daltonismo); el texto siempre va en tinta y el color identifica con un punto o una barra.
- En el celular (menos de 820 px): barra compacta, control segmentado de días, botones de 44 px como mínimo y diálogos como hoja que sube desde abajo.

## Datos y sincronización

Los datos se guardan como registros en cuatro colecciones: `blocks`, `goals`, `tasks` y `weeks`. Cada registro tiene `updatedAt` y `deviceId`, y borrar deja una lápida; así cualquier base de datos puede sincronizar dispositivos resolviendo conflictos registro por registro.

- **Sin configurar nada**: todo queda en el navegador (localStorage) y se comparte entre pestañas.
- **Con base de datos**: definir `VITE_SYNC_URL` (ver `.env.example`) o pasar otro backend a `initData`. Los cambios se encolan, funcionan sin conexión y se suben al volver. Detalles en [docs/BASE_DE_DATOS.md](docs/BASE_DE_DATOS.md).

Si este navegador tenía datos de la versión anterior (`francisco-app-v2`), se migran solos la primera vez.
