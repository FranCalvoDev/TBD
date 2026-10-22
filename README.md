# TBD · MiSemana

**ToBeDone — week & goals manager.** Planificador semanal: semana tipo con bloques, tareas únicas que se ubican en los huecos libres, metas semanales y estadísticas. Funciona sin conexión y está preparado para sincronizar entre dispositivos con una base de datos.

La app se instala **vacía**: cada persona crea sus categorías, bloques, tareas y metas. Nada personal viaja en el código.

## App de Android

La app se empaqueta como app nativa de Android con [Capacitor](https://capacitorjs.com): el mismo código web corre dentro de la app, con ícono propio, botón «atrás» del sistema, barra de estado según el tema y fuente incluida (funciona sin conexión).

- **Descargar:** cada push compila el APK en GitHub Actions (pestaña *Actions* → *App Android* → artefacto). En `main` además se publica en *Releases*, con enlace directo para abrir desde el teléfono.
- **Instalar:** abrir el APK en el teléfono y aceptar «instalar apps de origen desconocido» la primera vez. Las versiones nuevas se instalan encima y conservan los datos.
- **Id de la app:** `com.francalvodev.tbd`. Cambiarlo después obliga a desinstalar y perder los datos del teléfono (salvo que se exporte una copia antes).
- **Firma:** para que las actualizaciones se instalen encima (y para Play Store), cargar los secretos `ANDROID_KEYSTORE_BASE64` y `ANDROID_KEYSTORE_PASSWORD` en *Settings → Secrets and variables → Actions*. Sin ellos el APK es de prueba.
- **Desarrollo local** (con Android Studio instalado): `npm run android` copia la web al proyecto `android/` y `npm run android:open` lo abre en Android Studio.
- **Ícono y pantalla de inicio:** se generan desde `assets/` con `npx capacitor-assets generate --android`.

## Uso

```bash
npm install
npm run dev       # servidor de desarrollo en http://localhost:5173
npm test          # tests de lógica, guardado y sincronización
npm run build     # versión final en dist/ (se puede subir tal cual a GitHub Pages)
```

`index.html` no se abre con doble clic: usa módulos de JavaScript que necesitan `npm run dev` o el build de `dist/`.

## Funcionalidades

- **Ahora mismo**: el bloque en curso, cuánto falta y qué sigue.
- **Categorías**: cada persona crea las suyas, con nombre y uno de los 8 colores de la paleta. La app trae algunas genéricas para empezar, que se pueden renombrar o borrar.
- **Semana tipo**: grilla de lunes a domingo (vista por día en el celular) con filtro por categoría. Cada bloque tiene notas y tips propios, se puede marcar como hecho, dar de baja esta semana, editar o eliminar.
- **Tareas**: tareas únicas con tiempo estimado, categoría y fecha límite. La app sugiere huecos libres o bloques liberados y las agenda en la grilla.
- **Metas de la semana**: contadores editables; cada lunes empieza una semana nueva.
- **Estadísticas**: cumplimiento por semana y por día, horas por área, metas y tareas completadas.
- **Tus datos**: exportar e importar una copia de seguridad (archivo JSON). En Android se comparte a Drive, correo o Archivos; en el navegador se descarga.
- **Sincronizar con tu servidor**: cada grupo puede levantar su propio servidor (Docker) y conectar sus dispositivos con una dirección y una clave de acceso. Sin cuentas en internet. Guía: [docs/AUTOALOJADO.md](docs/AUTOALOJADO.md).
- Tema claro/oscuro.

## Estructura

```
index.html            solo el HTML de la página
android/              proyecto nativo de Android (Capacitor)
assets/               ícono y pantalla de inicio de la app
.github/workflows/    compilación del APK
src/
  main.js             punto de entrada: conecta datos, lógica e interfaz
  native.js           integración con Android: botón atrás y barra de estado
  styles/             CSS por sección (tokens y temas, grilla, tareas, metas, diálogos…)
  data/               días, paleta de colores y categorías iniciales genéricas
  core/               utilidades sin dependencias: tiempo, reloj, escape de HTML, localStorage seguro
  domain/             reglas de negocio puras (sin DOM): huecos libres, sugerencias, validación, estadísticas
  state/              store con registros versionados, selectores memorizados y acciones (todas las escrituras)
  storage/            guardado local, migración de versiones viejas y sincronización con la base de datos
  ui/                 una pieza por sección de la pantalla; dibujan desde el estado y llaman acciones
tests/                tests de Vitest para core, domain, state y storage
selfhost/             servidor de sincronización autoalojado (Docker Compose, MongoDB Atlas, gestión de claves)
docs/AUTOALOJADO.md   guía paso a paso para levantar un servidor propio
docs/BASE_DE_DATOS.md modelo de datos y contrato de sincronización
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

- `src/styles/tokens.css`: toda la paleta, tipografía, radios y sombras. Para cambiar la apariencia, empezar por acá.
- Tipografía: **Chakra Petch** (industrial/techno) en títulos, horas y números; **Inter** (San Francisco en Apple) en el texto. Las dos van incluidas en la app y funcionan sin conexión.
- Los colores de categoría están validados para que se distingan entre sí (también con daltonismo); el texto siempre va en tinta y el color identifica con un punto o una barra.
- En el celular (menos de 820 px): barra compacta, control segmentado de días, botones de 44 px como mínimo y diálogos como hoja que sube desde abajo.

## Privacidad y copias de seguridad

El repositorio es público, así que **no contiene datos de nadie**: ni rutinas, ni metas, ni preferencias.

- Los datos de cada persona viven en su dispositivo (y en su base de datos, si conecta una).
- La copia de seguridad se exporta desde la sección *Tus datos* y queda solo donde la persona la guarde.
- `.gitignore` ignora `tbd-copia*.json` y `*.tbd.json` para que una copia no se suba por error.
- Importar una copia reemplaza todo lo que hay en la app por lo de la copia (pide confirmación).

## Datos y sincronización

Los datos se guardan como registros en cinco colecciones: `categories`, `blocks`, `goals`, `tasks` y `weeks`. Cada registro tiene `updatedAt` y `deviceId`, y borrar deja una lápida, así los dispositivos se sincronizan resolviendo conflictos registro por registro.

- **Sin servidor** (lo predeterminado): todo queda en el dispositivo y se comparte entre pestañas del navegador.
- **Con un servidor propio**: quien administra el servidor del grupo crea una clave para cada persona; en la app se completa la dirección y la clave en *Tus datos → Sincronizar con tu servidor*. Los cambios se encolan, funcionan sin conexión y se suben al volver. Paso a paso en [docs/AUTOALOJADO.md](docs/AUTOALOJADO.md).
- La app no trae ninguna dirección ni clave: cada grupo configura la suya en sus dispositivos.

Esta hecho a mi medida, pero es un programa muy moldeable asi que se puede ajustar a quien lo necesite
xoxo
