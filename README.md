# Viandas API

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Jest](https://img.shields.io/badge/Tests-Jest-C21325?logo=jest&logoColor=white)](https://jestjs.io/)

API REST para gestionar menus, sedes, usuarios y pedidos de viandas con cupos
diarios, autenticacion JWT y permisos por rol.

## Contenido

- [Requisitos](#requisitos)
- [Instalacion local](#instalacion-local)
- [Usuarios de prueba](#usuarios-de-prueba)
- [Scripts disponibles](#scripts-disponibles)
- [Variables de entorno](#variables-de-entorno)
- [Uso de la API](#uso-de-la-api)
- [Endpoints](#endpoints)
- [Reglas de negocio](#reglas-de-negocio)
- [Tests](#tests)
- [Despliegue en Render](#despliegue-en-render)
- [Estructura del proyecto](#estructura-del-proyecto)

## Caracteristicas

- Registro y login con contrasenas hasheadas mediante bcrypt.
- Autenticacion JWT con roles `usuario` y `admin`.
- Menus con cupo diario disponible calculado desde los pedidos.
- Gestion administrativa de menus, sedes y usuarios.
- Pedidos con historial de cambios y transiciones de estado controladas.
- Validacion de cuerpos, parametros, filtros y fechas.
- Persistencia SQLite con migraciones automaticas.
- Sincronizacion idempotente de menus y sedes faltantes.
- Healthcheck, CORS configurable, Helmet y rate limit para autenticacion.

## Requisitos

- Node.js 18 o superior.
- npm.
- Git.

Comprobar versiones:

```bash
node --version
npm --version
git --version
```

## Instalacion local

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/Aznar-7/ViandaApp_Back.git Viandas-Back
cd Viandas-Back
npm install
```

### 2. Crear el archivo de entorno

Linux, macOS o Git Bash:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Editar `.env` y reemplazar `JWT_SECRET` por un valor largo y aleatorio:

```env
PORT=3000
JWT_SECRET=reemplazar-con-un-secreto-largo-y-aleatorio
DB_FILE=./data/database.sqlite
CORS_ORIGIN=http://localhost:5173
BUSINESS_TIME_ZONE=America/Argentina/Buenos_Aires
JWT_ISSUER=viandas-api
JWT_AUDIENCE=viandas-frontend
TRUST_PROXY_HOPS=0
SEED_ON_START=false
SYNC_MENUS_ON_START=true
SYNC_SEDES_ON_START=true
```

Para generar un secreto desde Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Inicializar y cargar datos demo

```bash
npm run init-db
npm run seed
```

`init-db` crea las tablas y aplica migraciones. `seed` carga usuarios de prueba,
menus, sedes y pedidos demo solamente cuando la tabla de usuarios esta vacia.

### 4. Iniciar el servidor

Desarrollo con recarga automatica:

```bash
npm run dev
```

Ejecucion normal:

```bash
npm start
```

La API queda disponible en:

```text
http://localhost:3000
```

### 5. Verificar la instalacion

```bash
curl http://localhost:3000/
curl http://localhost:3000/api/health
```

Respuestas esperadas:

```json
{ "service": "viandas-api", "status": "ok" }
```

```json
{ "status": "ok", "database": "connected" }
```

## Usuarios de prueba

El comando `npm run seed` crea estos usuarios:

| Rol | Email | Contrasena |
|---|---|---|
| Admin | `admin@viandas.com` | `admin123` |
| Usuario | `juan@viandas.com` | `user123` |
| Usuario | `maria@viandas.com` | `user123` |

Estas credenciales son solo para desarrollo y demostracion. No ejecutar el seed
demo en produccion real.

Ejemplo de login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@viandas.com","password":"admin123"}'
```

La respuesta incluye un token y el usuario autenticado:

```json
{
  "token": "<jwt>",
  "usuario": {
    "id": 1,
    "nombre": "Admin",
    "email": "admin@viandas.com",
    "rol": "admin",
    "activo": 1
  }
}
```

Enviar el token en rutas protegidas:

```http
Authorization: Bearer <jwt>
```

## Scripts disponibles

| Comando | Descripcion |
|---|---|
| `npm run dev` | Inicia el servidor con Nodemon |
| `npm start` | Inicializa la base y levanta el servidor |
| `npm test` | Ejecuta todos los tests con Jest |
| `npm run init-db` | Crea tablas, indices y aplica migraciones |
| `npm run seed` | Carga datos demo si no existen usuarios |
| `npm run sync-menus` | Inserta menus seed faltantes sin sobrescribir cambios administrativos |
| `npm run sync-sedes` | Inserta sedes seed faltantes sin sobrescribir cambios administrativos |
| `npm run sync-menu-images` | Sincroniza URLs de imagenes de menus conocidos |

## Variables de entorno

| Variable | Requerida | Default | Descripcion |
|---|---|---|---|
| `PORT` | No | `3000` | Puerto HTTP |
| `JWT_SECRET` | Si | Sin default | Secreto utilizado para firmar JWT |
| `DB_FILE` | No | `./data/database.sqlite` | Ruta del archivo SQLite |
| `CORS_ORIGIN` | En produccion | `http://localhost:5173` en desarrollo | Origins permitidos separados por coma |
| `BUSINESS_TIME_ZONE` | No | `America/Argentina/Buenos_Aires` | Zona horaria de negocio |
| `JWT_ISSUER` | No | `viandas-api` | Emisor esperado del token |
| `JWT_AUDIENCE` | No | `viandas-frontend` | Audiencia esperada del token |
| `TRUST_PROXY_HOPS` | No | `0` desarrollo, `1` produccion | Cantidad de proxies confiables |
| `SEED_ON_START` | No | `false` | Ejecuta el seed demo al iniciar |
| `SYNC_MENUS_ON_START` | No | `true` | Inserta menus seed faltantes al iniciar |
| `SYNC_SEDES_ON_START` | No | `true` | Inserta sedes seed faltantes al iniciar |

Para autorizar varios frontends:

```env
CORS_ORIGIN=http://localhost:5173,https://admin.example.com
```

## Uso de la API

Todas las respuestas usan JSON. Los errores tienen este formato:

```json
{ "error": "Descripcion del error" }
```

Codigos frecuentes:

| Codigo | Significado |
|---|---|
| `200` | Operacion exitosa |
| `201` | Recurso creado |
| `400` | Validacion o regla de negocio invalida |
| `401` | Token ausente, invalido o expirado |
| `403` | Usuario autenticado sin permisos |
| `404` | Recurso inexistente |
| `409` | Conflicto, por ejemplo email o sede duplicada |
| `500` | Error interno inesperado |

### Crear un pedido

Primero consultar menus y sedes activas:

```bash
curl "http://localhost:3000/api/menus?fecha=2026-06-13&activo=1"
curl "http://localhost:3000/api/sedes"
```

Luego crear el pedido:

```bash
curl -X POST http://localhost:3000/api/pedidos \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "menuId": 10,
    "fecha": "2026-06-13",
    "cantidad": 2,
    "turnoEntrega": "almuerzo",
    "puntoRetiroId": 1,
    "observaciones": "Sin cubiertos"
  }'
```

El backend calcula el total, asigna el usuario autenticado y establece el estado
inicial `pendiente`.

### Crear un menu como admin

```bash
curl -X POST http://localhost:3000/api/menus \
  -H "Authorization: Bearer <jwt-admin>" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Menu del dia",
    "descripcion": "Pollo al horno con vegetales",
    "fecha": "2030-02-15",
    "tipo": "clasico",
    "precio": 2500,
    "cupoDiario": 30,
    "activo": 1,
    "imagenUrl": "/assets/pollo_al_horno.jpg"
  }'
```

### Asignar rol admin a un usuario

```bash
curl -X PUT http://localhost:3000/api/usuarios/2 \
  -H "Authorization: Bearer <jwt-admin>" \
  -H "Content-Type: application/json" \
  -d '{"rol":"admin"}'
```

Los cambios de rol y estado toman efecto inmediatamente porque cada request
protegido consulta el usuario vigente en la base de datos.

## Endpoints

Leyenda:

- Publico: no requiere token.
- Autenticado: requiere cualquier usuario activo.
- Admin: requiere un usuario activo con rol `admin`.

### Sistema

| Metodo | Ruta | Acceso | Descripcion |
|---|---|---|---|
| `GET` | `/` | Publico | Estado basico del servicio |
| `GET` | `/api/health` | Publico | Verifica servicio y conexion a base |

### Autenticacion

| Metodo | Ruta | Acceso | Descripcion |
|---|---|---|---|
| `POST` | `/api/auth/register` | Publico | Registra un usuario con rol `usuario` |
| `POST` | `/api/auth/login` | Publico | Devuelve JWT y datos del usuario |

Registro y login tienen un limite de 20 solicitudes por IP cada 15 minutos.

### Menus

| Metodo | Ruta | Acceso | Descripcion |
|---|---|---|---|
| `GET` | `/api/menus` | Publico | Lista menus y cupo disponible |
| `GET` | `/api/menus/:id` | Admin | Obtiene un menu |
| `POST` | `/api/menus` | Admin | Crea un menu |
| `PUT` | `/api/menus/:id` | Admin | Edita parcialmente un menu |
| `PATCH` | `/api/menus/:id/activar` | Admin | Activa un menu |
| `PATCH` | `/api/menus/:id/desactivar` | Admin | Desactiva un menu |

Filtros de listado: `tipo`, `fecha`, `activo`.

Tipos permitidos: `clasico`, `vegetariano`, `vegano`, `sin_tacc`.

No se puede reducir `cupoDiario` por debajo de la cantidad ya reservada ni
cambiar la fecha de un menu que ya posee pedidos.

### Sedes

| Metodo | Ruta | Acceso | Descripcion |
|---|---|---|---|
| `GET` | `/api/sedes` | Publico | Lista sedes activas por defecto |
| `GET` | `/api/sedes/:id` | Admin | Obtiene una sede |
| `POST` | `/api/sedes` | Admin | Crea una sede |
| `PUT` | `/api/sedes/:id` | Admin | Edita parcialmente una sede |
| `PATCH` | `/api/sedes/:id/activar` | Admin | Activa una sede |
| `PATCH` | `/api/sedes/:id/desactivar` | Admin | Desactiva una sede |

Filtro de listado: `activo=0|1`.

Las sedes no se eliminan fisicamente para conservar pedidos historicos.

### Usuarios

| Metodo | Ruta | Acceso | Descripcion |
|---|---|---|---|
| `GET` | `/api/usuarios` | Admin | Lista usuarios |
| `GET` | `/api/usuarios/:id` | Admin | Obtiene un usuario |
| `POST` | `/api/usuarios` | Admin | Crea un usuario con rol y estado inicial |
| `PUT` | `/api/usuarios/:id` | Admin | Edita nombre, email, rol o estado |
| `PATCH` | `/api/usuarios/:id/activar` | Admin | Activa un usuario |
| `PATCH` | `/api/usuarios/:id/desactivar` | Admin | Desactiva un usuario |

Filtros de listado: `rol`, `activo`.

Roles permitidos: `usuario`, `admin`.

Nunca se devuelve `passwordHash`. Un admin no puede quitarse su propio rol ni
desactivar su propio usuario.

### Pedidos

| Metodo | Ruta | Acceso | Descripcion |
|---|---|---|---|
| `GET` | `/api/pedidos` | Autenticado | Lista pedidos propios; admin lista todos |
| `GET` | `/api/pedidos/resumen` | Admin | Devuelve resumen administrativo |
| `GET` | `/api/pedidos/:id` | Autenticado | Obtiene un pedido permitido |
| `GET` | `/api/pedidos/:id/historial` | Autenticado | Obtiene historial permitido |
| `POST` | `/api/pedidos` | Autenticado | Crea un pedido |
| `PUT` | `/api/pedidos/:id` | Autenticado | Edita un pedido permitido |
| `PATCH` | `/api/pedidos/:id/cancelar` | Autenticado | Cancela un pedido permitido |
| `PATCH` | `/api/pedidos/:id/confirmar` | Admin | Confirma un pedido |
| `PATCH` | `/api/pedidos/:id/entregar` | Admin | Marca un pedido como entregado |

Filtros de listado:

| Parametro | Valores | Default |
|---|---|---|
| `estado` | `pendiente`, `confirmado`, `cancelado`, `entregado` | Todos |
| `fecha` | Fecha real `YYYY-MM-DD` | Todas |
| `page` | Entero desde `1` | `1` |
| `limit` | Entero entre `1` y `100` | `10` |
| `order` | `fecha`, `estado`, `total` | `fecha` |

## Reglas de negocio

### Cupos

Los pedidos `pendiente`, `confirmado` y `entregado` consumen cupo. Los pedidos
`cancelado` no consumen cupo.

El alta y la edicion de pedidos se ejecutan dentro de transacciones serializadas
para evitar superar el cupo ante solicitudes concurrentes.

### Estados de pedido

```text
pendiente  -> confirmado  (admin)
pendiente  -> cancelado   (admin o usuario propietario)
confirmado -> cancelado   (admin o usuario propietario)
confirmado -> entregado   (admin)
```

`cancelado` y `entregado` son estados finales.

### Permisos

- Un usuario puede ver, editar y cancelar solamente sus propios pedidos.
- Un admin puede gestionar todos los pedidos, menus, sedes y usuarios.
- Las operaciones administrativas requieren JWT con rol `admin`.
- El registro publico siempre crea usuarios con rol `usuario`.

## Tests

Ejecutar:

```bash
npm test
```

Los tests usan `./data/test.sqlite`, eliminan esa base antes de cada ejecucion,
inicializan el esquema y cargan el seed demo automaticamente. No modifican la
base de desarrollo configurada en `.env`.

La suite cubre autenticacion, permisos, menus, sedes, usuarios, pedidos,
migraciones, validaciones, CORS, healthchecks y concurrencia de cupos.

## Despliegue en Render

### Configuracion del Web Service

```text
Build Command: npm install
Start Command: npm start
Health Check Path: /api/health
```

Variables recomendadas:

```env
NODE_ENV=production
JWT_SECRET=<secreto-largo-y-aleatorio>
CORS_ORIGIN=https://url-publica-del-frontend
BUSINESS_TIME_ZONE=America/Argentina/Buenos_Aires
TRUST_PROXY_HOPS=1
DB_FILE=/var/data/database.sqlite
SEED_ON_START=false
SYNC_MENUS_ON_START=true
SYNC_SEDES_ON_START=true
```

### Persistencia

SQLite necesita un Persistent Disk montado en `/var/data`. Sin disco persistente,
la base puede perderse al reiniciar o desplegar.

El servidor ejecuta al iniciar:

1. Creacion y migracion de tablas.
2. Seed demo solamente si `SEED_ON_START=true`.
3. Insercion de menus seed faltantes si `SYNC_MENUS_ON_START=true`.
4. Insercion de sedes seed faltantes si `SYNC_SEDES_ON_START=true`.

Las sincronizaciones no sobrescriben cambios realizados por administradores.

No usar `SEED_ON_START=true` en produccion real: crea credenciales demo conocidas.

SQLite es adecuado para una sola instancia. Para escalar horizontalmente, migrar
la persistencia a PostgreSQL u otro servidor de base de datos.

## Estructura del proyecto

```text
src/
  app.js                 Configuracion de Express y rutas
  server.js              Inicializacion de base y servidor HTTP
  assets/                Imagenes servidas por la API
  config/                Variables de entorno
  controllers/           Adaptadores HTTP
  database/              Conexion, esquema, migraciones y seeds
  domain/                Constantes del dominio
  middlewares/           Autenticacion, autorizacion y validacion
  routes/                Definicion de endpoints
  services/              Reglas de negocio y acceso a datos
  utils/                 Errores y utilidades compartidas
  validators/            Esquemas de validacion
tests/                   Tests de integracion
data/                    Archivos SQLite locales
```

## Notas operativas

- Las imagenes locales se sirven desde `/assets/<archivo>`.
- `imagenUrl` almacena la ruta de una imagen, pero la API no incluye upload de archivos.
- El total de un pedido siempre se calcula en backend.
- Los campos desconocidos en cuerpos JSON son rechazados.
- Las fechas deben enviarse como strings reales con formato `YYYY-MM-DD`.
- Para diagnosticar disponibilidad usar `/api/health`.

## Licencia

ISC.
