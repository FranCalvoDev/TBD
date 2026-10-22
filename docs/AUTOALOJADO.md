# Servidor propio (autoalojado)

TBD funciona sin internet y guarda todo en cada dispositivo. Si un grupo (familia, amigos, un equipo) quiere tener sus datos sincronizados entre varios teléfonos y computadoras, puede levantar **su propio servidor**: una computadora de la casa, un NAS, una Raspberry Pi o un servidor alquilado.

- No hay cuentas en internet ni un servidor central: cada grupo tiene el suyo.
- Quien administra el servidor crea una **clave de acceso** para cada persona.
- Los datos de cada persona viajan solo entre sus dispositivos y ese servidor. Cada persona ve únicamente lo suyo.

```
 Teléfono de Ana ─┐
 Compu de Ana ────┼──►  Servidor TBD (API) ───► MongoDB Atlas
 Teléfono de Beto ┘
```

El servidor HTTP de sincronización está en [`selfhost/`](../selfhost); MongoDB Atlas aloja los datos. La app nunca se conecta directamente a Atlas, y la URI de Atlas se mantiene solo en el servidor.

---

## Qué hace falta

- Un clúster de MongoDB Atlas y un usuario de base de datos con permisos sobre la base que usarás.
- Una máquina o servicio donde ejecutar el servidor HTTP con **Docker**:
  - Windows o Mac: [Docker Desktop](https://www.docker.com/products/docker-desktop/).
  - Linux o Raspberry Pi OS de 64 bits: Docker Engine con el plugin `compose`.
- Que Atlas permita conexiones desde la dirección IP pública de salida de la máquina que ejecuta el servidor. En Atlas configura *Network Access* con esa IP; evita permitir todas las IP (`0.0.0.0/0`).
- Que los dispositivos puedan alcanzar el servidor: por la **misma red**, VPN o dominio HTTPS (ver [Acceso fuera de casa](#acceso-fuera-de-casa)).

---

## Instalación

### 1. Descargar el proyecto

```bash
git clone https://github.com/<usuario>/<repositorio>.git tbd
cd tbd/selfhost
```

Sin git: descarga el ZIP desde GitHub (*Code → Download ZIP*), descomprímelo y entra a la carpeta `selfhost`.

### 2. Configurar

```bash
cp .env.example .env
```

En Atlas, crea un clúster, un usuario de base de datos y agrega la IP de salida del servidor a *Network Access*. En *Connect → Drivers*, copia la URI de conexión. En `.env`, reemplaza el usuario, la contraseña y el host del ejemplo con los valores de Atlas; codifica en URL los caracteres especiales de usuario o contraseña. Define también el nombre de la base de datos si no quieres usar `tbd`.

`MONGODB_URI` es un secreto: `.env` queda solo en esa máquina y nunca se sube al repositorio. No compartas esta URI con los usuarios de la app.

Esta versión no importa las tablas ni los usuarios del servidor PostgreSQL anterior. Crea de nuevo las claves de acceso en Atlas; los registros locales de cada dispositivo siguen en el dispositivo y se pueden volver a sincronizar al conectarlo.

### 3. Arrancar

```bash
docker compose up -d
```

La primera vez descarga y construye la imagen del servidor. Para comprobar que funciona:

```bash
docker compose ps                         # «servidor» debe decir «Up»
curl http://localhost:8787/health         # responde {"ok":true}
```

El servidor crea los índices MongoDB necesarios al arrancar y vuelve a iniciarse automáticamente con Docker.

### 4. Crear una clave para cada persona

```bash
docker compose exec servidor node manage.js add <nombre>
```

Por ejemplo `... add Ana`. Muestra la clave **una sola vez**: cópiala y pásasela a esa persona por un medio privado. Si se pierde, se genera otra (ver [Administración](#administración)).

### 5. Averiguar la dirección del servidor

En la red de casa, la dirección es `http://<IP-de-la-máquina>:8787`.

- Windows: `ipconfig` → «Dirección IPv4».
- Mac: *Ajustes → Red* → la conexión activa.
- Linux: `hostname -I`.

Recomendado: en el router, **reservar esa IP** para la máquina así no cambia. Si hay firewall, permitir el puerto `8787`.

### 6. Conectar cada dispositivo

En la app: **Tus datos → Sincronizar con tu servidor**.

1. Dirección del servidor: por ejemplo `192.168.1.10:8787` (la app completa `http://`).
2. Clave de acceso: la que te dio quien administra el servidor.
3. **Conectar**.

Lo que ya tenías en ese dispositivo se combina con lo del servidor. En un dispositivo nuevo, tus datos bajan solos. Arriba se ve el estado: «Sincronizado», «Sincronizando» o «Sin conexión» (en ese caso los cambios se guardan y se suben al volver).

---

## Acceso fuera de casa

Elige una de estas dos opciones. **No abras el puerto 8787 del router a internet**: sin HTTPS, la clave viajaría sin cifrar.

### Opción A — VPN con Tailscale (la más simple, recomendada)

1. Instala [Tailscale](https://tailscale.com/) en el servidor y en cada teléfono, con la misma cuenta del grupo.
2. En la app usa la dirección de Tailscale del servidor: `100.x.y.z:8787`.

El tráfico va cifrado y no hay que abrir nada en el router.

### Opción B — Dominio propio con HTTPS

1. Apunta un dominio (por ejemplo `tbd.midominio.com`) a la IP pública de tu casa o servidor.
2. En el router, abre los puertos **80 y 443** hacia esa máquina.
3. En `.env`, completa `TBD_DOMAIN=tbd.midominio.com`.
4. Arranca con HTTPS:
   ```bash
   docker compose --profile https up -d
   ```
5. En la app usa `https://tbd.midominio.com`.

El certificado se obtiene y renueva solo (Caddy + Let's Encrypt).

---

## Administración

Todos los comandos se ejecutan dentro de `selfhost/`:

| Para… | Comando |
|---|---|
| Ver las personas | `docker compose exec servidor node manage.js list` |
| Crear una persona | `docker compose exec servidor node manage.js add <nombre>` |
| Clave nueva (perdida o filtrada) | `docker compose exec servidor node manage.js new-key <nombre>` |
| Bloquear el acceso (sus datos quedan) | `docker compose exec servidor node manage.js revoke <nombre>` |
| Borrar a alguien y todos sus datos | `docker compose exec servidor node manage.js delete <nombre>` |
| Ver qué pasa | `docker compose logs -f servidor` |
| Actualizar a una versión nueva | `git pull && docker compose up -d --build` |
| Apagar | `docker compose down` (los datos quedan guardados) |

Un bloqueo o una clave nueva se aplican en menos de 30 segundos.

### Copias de seguridad

Configura y verifica las copias de seguridad del clúster desde Atlas (o usa `mongodump`/`mongorestore` con las credenciales de respaldo). Guarda las copias fuera del clúster. Además, cada persona puede exportar su propia copia desde la app (**Tus datos → Exportar copia**).

---

## Seguridad

- Las claves se guardan en la base de datos solo como hash (SHA-256): quien vea la base no puede leerlas.
- Cada clave da acceso únicamente a los datos de su persona.
- La URI de Atlas en `.env`, las claves y las copias nunca van al repositorio (`.gitignore` ya los excluye).
- La app de Android admite `http://` para servidores en la red de casa o por VPN. Para acceso por internet usa siempre HTTPS (opción B) o Tailscale (opción A).

---

## Problemas frecuentes

| Mensaje en la app | Qué revisar |
|---|---|
| «No se pudo conectar con el servidor» | Que el teléfono esté en la misma red (o con Tailscale encendido), que la IP sea la correcta y que el firewall permita el puerto 8787. Desde el teléfono, abre `http://<IP>:8787/health` en el navegador: debe mostrar `{"ok":true}`. |
| «La clave de acceso no es válida o fue bloqueada» | Que la clave esté completa (empieza con `tbd_`). Si hace falta, genera otra con `new-key`. |
| «No parece un servidor TBD» | La dirección responde, pero es otro servicio: revisa el puerto. |
| `docker compose up` dice «Falta MONGODB_URI» | Falta completar `.env` con la URI del clúster Atlas (paso 2). |
| El servidor no inicia o Atlas rechaza la conexión | Revisa que la URI y el usuario de base de datos sean correctos, que la contraseña esté codificada en URL y que *Network Access* permita la IP de salida del servidor. |
