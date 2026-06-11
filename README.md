<div align="center">

# 🍱 Viandas API

**Backend RESTful para gestión de pedidos de viandas con cupos diarios.**

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](#)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](#)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](#)
[![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](#)
[![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)](#)

</div>

---

## ⚡ Quickstart

```bash
npm install
npm run init-db   # crea las tablas
npm run seed      # carga datos de prueba
npm run dev       # 🚀 http://localhost:3000
```

---

## 🔐 Variables de entorno

`.env` en la raíz:

```env
PORT=3000
JWT_SECRET=tu_clave_secreta
DB_FILE=./data/database.sqlite
CORS_ORIGIN=http://localhost:5173
BUSINESS_TIME_ZONE=America/Argentina/Buenos_Aires
```

`CORS_ORIGIN` define los frontends autorizados. En produccion es obligatorio y
debe contener la URL publica exacta del frontend, sin rutas:

```env
NODE_ENV=production
CORS_ORIGIN=https://viandas.example.com
```

Para autorizar mas de un frontend, separar las URLs por coma:

```env
CORS_ORIGIN=https://viandas.example.com,https://admin.viandas.example.com
```

No usar `*`: la API acepta solamente los origins declarados. Requests internos
sin header `Origin` siguen permitidos.

---

## Despliegue en Render

Configuracion recomendada del Web Service:

```text
Build Command: npm install
Start Command: npm start
Health Check Path: /api/health
```

Variables de entorno:

```env
NODE_ENV=production
JWT_SECRET=<secreto-largo-y-aleatorio>
CORS_ORIGIN=https://url-publica-del-frontend
BUSINESS_TIME_ZONE=America/Argentina/Buenos_Aires
TRUST_PROXY_HOPS=1
DB_FILE=/var/data/database.sqlite
SEED_ON_START=false
```

- `TRUST_PROXY_HOPS=1` permite que `express-rate-limit` identifique correctamente
  la IP real detras del proxy de Render.
- El servidor ejecuta automaticamente `initDb()` antes de escuchar conexiones.
- `SEED_ON_START=true` carga usuarios y datos demo. No usarlo en produccion real
  porque crea credenciales conocidas.
- SQLite necesita un Persistent Disk montado en `/var/data`. Sin disco
  persistente, Render puede perder toda la base al reiniciar o desplegar.
- Para escalar a mas de una instancia, migrar SQLite a PostgreSQL.

Healthchecks:

```http
GET /             # proceso HTTP activo
GET /api/health   # proceso activo y conexion a base disponible
```

---

## 👥 Credenciales del seed

| Rol | Email | Password |
|---|---|---|
| 👑 Admin | admin@viandas.com | admin123 |
| 🙍 Usuario | juan@viandas.com | user123 |
| 🙍 Usuario | maria@viandas.com | user123 |

> El seed también carga **6 menús** y **12 pedidos** distribuidos en todos los estados.

---

## 🗺️ Endpoints

### 🔓 Auth — público

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/register` | Crear cuenta |
| `POST` | `/api/auth/login` | Login → devuelve JWT |

```json
// POST /register
{ "nombre": "string", "email": "string", "password": "string" }

// POST /login
{ "email": "string", "password": "string" }
```

---

### 🍽️ Menús — público

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/menus` | Listar menús con cupo disponible |

**Query params:** `tipo` · `fecha` · `activo`

---

### 📦 Pedidos — requiere JWT

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `GET` | `/api/pedidos` | 👑 🙍 | Listado paginado |
| `GET` | `/api/pedidos/resumen` | 👑 | Resumen admin |
| `GET` | `/api/pedidos/:id` | 👑 🙍 | Detalle |
| `GET` | `/api/pedidos/:id/historial` | 👑 🙍 | Historial de cambios |
| `POST` | `/api/pedidos` | 👑 🙍 | Crear pedido |
| `PUT` | `/api/pedidos/:id` | 👑 🙍 | Editar pedido |
| `PATCH` | `/api/pedidos/:id/cancelar` | 👑 🙍 | Cancelar |
| `PATCH` | `/api/pedidos/:id/confirmar` | 👑 | Confirmar |
| `PATCH` | `/api/pedidos/:id/entregar` | 👑 | Marcar entregado |

**Query params para listado:** `estado` · `fecha` · `page` · `limit` · `order`

> 🙍 El usuario solo ve y opera sus propios pedidos. 👑 El admin ve todo.

---

## 🪙 JWT

El login devuelve:

```json
{
  "token": "<jwt>",
  "usuario": { "id": 1, "nombre": "Admin", "email": "...", "rol": "admin", "activo": 1 }
}
```

**Payload del token:**
```json
{ "id": 1, "email": "admin@viandas.com", "rol": "admin" }
```

| | |
|---|---|
| ⏱️ Expiración | 8 horas |
| 🔒 Datos sensibles | No incluye `passwordHash` |

**Cómo enviarlo:**
```
Authorization: Bearer <token>
```

---

## 🛡️ Roles y permisos

### 🙍 Usuario
- Crear pedidos propios
- Ver sus pedidos e historial
- Cancelar y editar sus pedidos en estado `pendiente` o `confirmado`

### 👑 Administrador
- Todo lo anterior sobre **cualquier** pedido
- Confirmar pedidos
- Marcar pedidos como entregados
- Ver el resumen administrativo

---

## 🔄 Flujo de estados

```
  pendiente ──────► confirmado ──────► entregado
      │                  │
      └──────────────────┴──────────► cancelado
```

| Transición | Quién |
|---|---|
| `pendiente → confirmado` | 👑 Admin |
| `pendiente → cancelado` | 👑 Admin · 🙍 Dueño |
| `confirmado → cancelado` | 👑 Admin · 🙍 Dueño |
| `confirmado → entregado` | 👑 Admin |

> Cualquier otra transición → **400**

---

## 📐 Cálculo de cupos

```
cupoDisponible = cupoDiario − Σ( cantidades en estado pendiente, confirmado o entregado )
```

- Solo `cancelado` **no consume cupo**
- Al **crear**: se valida contra el cupo disponible
- Al **editar**: el pedido actual se excluye del conteo para no contarse dos veces
- `total` siempre lo calcula el backend → `precio × cantidad`

---

## 🧪 Testing

```bash
npm run init-db && npm run seed   # base de datos lista
npm test                          # 12 tests, todos verdes
```

| # | Caso | HTTP |
|---|---|---|
| 1 | Login correcto | `200` |
| 2 | Login con password inválida | `401` |
| 3 | Listado con filtro de estado | `200` |
| 4 | Detalle de pedido existente | `200` |
| 5 | Detalle de pedido inexistente | `404` |
| 6 | Alta válida | `201` |
| 7 | Alta con cantidad ≤ 0 | `400` |
| 8 | Alta sin cupo disponible | `400` |
| 9 | Acceso sin JWT | `401` |
| 10 | Confirmar como usuario | `403` |
| 11 | Edición que supera cupo | `400` |
| 12 | Edición de pedido entregado | `400` |

> Los tests limpian los datos que crean → son **repetibles**.

---

## 🗂️ Estructura del proyecto

```
src/
├── config/
│   └── env.js                  variables de entorno
├── database/
│   ├── db.js                   conexión SQLite (singleton)
│   ├── initDb.js               creación de tablas
│   └── seedDb.js               datos de prueba
├── middlewares/
│   ├── authenticate.js         verificación JWT → req.user
│   ├── authorize.js            control de roles
│   ├── errorHandler.js         manejo centralizado de errores
│   └── validate.js             validación de body por schema
├── validators/
│   ├── auth.validators.js
│   └── pedidos.validators.js
├── routes/
│   ├── auth.routes.js
│   ├── menus.routes.js
│   └── pedidos.routes.js
├── controllers/
│   ├── auth.controller.js
│   ├── menus.controller.js
│   └── pedidos.controller.js
├── services/
│   ├── auth.service.js
│   ├── menus.service.js
│   └── pedidos.service.js
├── utils/
│   └── AppErrors.js
├── app.js
└── server.js
tests/
├── auth.test.js
└── pedidos.test.js
```

---

## 📡 Códigos HTTP

| Código | Significado |
|---|---|
| `200` | OK |
| `201` | Recurso creado |
| `400` | Error de validación o regla de negocio |
| `401` | Token ausente o inválido |
| `403` | Sin permisos para la operación |
| `404` | Recurso no encontrado |
| `500` | Error interno del servidor |

---

## ⚠️ Limitaciones conocidas

- **SQLite local**: no apto para múltiples instancias del servidor en paralelo.
- **Sin refresh token**: al expirar el JWT (8h) hay que hacer login de nuevo.
- **Menús sin CRUD**: se gestionan únicamente mediante el seed.
- **Tests sobre la DB de desarrollo**: ejecutar el seed antes de correr tests es obligatorio.

---

<div align="center">
  <sub>Desarrollado para DDS 2026 · Curso 3K2</sub>
</div>
