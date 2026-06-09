# Roadmap — Viandas Back

Fecha límite: **13/06/2026 23:55 hs**

---

## Estado actual

| Archivo | Estado |
|---|---|
| `src/config/env.js` | Hecho |
| `src/database/db.js` | Hecho |
| `src/database/initDb.js` | Hecho |
| `src/utils/AppErrors.js` | Hecho |
| `src/app.js` | Vacío |
| `src/server.js` | Vacío |

---

## Estructura objetivo

```
src/
├── config/
│   └── env.js
├── database/
│   ├── db.js
│   ├── initDb.js
│   └── seedDb.js
├── middlewares/
│   ├── errorHandler.js
│   ├── auth.js
│   ├── authorize.js
│   └── validate.js
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

## Fase 1 — Núcleo del servidor

**Archivos:** `src/app.js`, `src/server.js`, `src/middlewares/errorHandler.js`

- `app.js`: configurar Express, cors, json body parser, montar rutas, montar errorHandler al final
- `server.js`: importar app, escuchar en `PORT`
- `errorHandler.js`: middleware de 4 parámetros `(err, req, res, next)` — si `err.isOperational` responde con `err.statusCode`, sino 500

---

## Fase 2 — Seed de datos

**Archivo:** `src/database/seedDb.js`

Insertar (solo si la tabla está vacía):
- 6 menús con distintos tipos (`clasico`, `vegetariano`, `vegano`, `sin_tacc`), fechas variadas, cupo entre 5 y 20
- 1 admin + 2 usuarios comunes con contraseñas hasheadas con `bcryptjs`
- 12 pedidos distribuidos entre los usuarios, en distintos estados

---

## Fase 3 — Autenticación

**Archivos:** `routes/auth.routes.js`, `controllers/auth.controller.js`, `services/auth.service.js`

### Endpoints
```
POST /api/auth/register
POST /api/auth/login
```

### `auth.service.js`
- `register(nombre, email, password, rol)` — hashear password, insertar, devolver usuario sin hash
- `login(email, password)` — buscar por email, comparar hash, firmar JWT con `{ id, email, rol }`, expiración 8h

### `auth.controller.js`
- Delegar al servicio, responder 201 en register y 200 + token en login

### Criterios
- JWT sin datos sensibles (no incluir `passwordHash`)
- Rechazar email duplicado con 400

---

## Fase 4 — Middlewares transversales

**Archivos:** `middlewares/auth.js`, `middlewares/authorize.js`, `middlewares/validate.js`

### `auth.js`
- Leer `Authorization: Bearer <token>`, verificar con `jsonwebtoken`
- Si no hay token → 401; si es inválido → 401; si pasa → adjuntar `req.user` y llamar `next()`

### `authorize.js`
- `authorize(...roles)` → devuelve middleware que verifica `req.user.rol`
- Si el rol no está permitido → 403

### `validate.js`
- `validate(schema)` → devuelve middleware que valida `req.body` contra un schema simple (objeto con campos requeridos y tipos)
- Si falla → `next(AppError(mensaje, 400))`

---

## Fase 5 — Módulo Menús

**Archivos:** `routes/menus.routes.js`, `controllers/menus.controller.js`, `services/menus.service.js`

### Endpoint
```
GET /api/menus
```

### `menus.service.js`
- `listarMenus({ tipo, fecha, activo })` — query con filtros opcionales, devuelve menús activos por defecto

### Criterios
- Público (no requiere JWT)
- Incluir cupo disponible calculado: `cupoDiario - Σ(cantidades pendientes + confirmadas)`

---

## Fase 6 — Módulo Pedidos (núcleo del dominio)

**Archivos:** `routes/pedidos.routes.js`, `controllers/pedidos.controller.js`, `services/pedidos.service.js`

### Endpoints
```
GET    /api/pedidos               → usuario: sus pedidos | admin: todos
GET    /api/pedidos/resumen       → solo admin
GET    /api/pedidos/:id
GET    /api/pedidos/:id/historial
POST   /api/pedidos
PUT    /api/pedidos/:id
PATCH  /api/pedidos/:id/cancelar
PATCH  /api/pedidos/:id/confirmar
PATCH  /api/pedidos/:id/entregar
```

### `pedidos.service.js` — funciones principales

**`listarPedidos({ usuarioId, rol, estado, fecha, page, limit, order })`**
- Si rol `usuario`: filtrar por `usuarioId`
- Paginación con `LIMIT` / `OFFSET`, ordenamiento por `fecha` o `estado`

**`obtenerPedido(id, usuarioId, rol)`**
- Si rol `usuario` y el pedido no le pertenece → 403

**`crearPedido({ menuId, usuarioId, fecha, cantidad, turnoEntrega, puntoRetiro, observaciones })`**
1. Verificar que el menú existe, está activo y tiene la fecha solicitada → 404 / 400
2. Calcular cupo disponible: `cupoDiario - Σ(pendientes + confirmados)` → si `cantidad > cupoDisponible` → 400
3. Rechazar `cantidad <= 0` → 400
4. Calcular `total = precio * cantidad` en backend
5. Insertar pedido con estado `pendiente`
6. Registrar en `historial_pedidos`

**`editarPedido(id, usuarioId, rol, cambios)`**
- Solo pendiente o confirmado
- Revalidar cupo restando la cantidad anterior y sumando la nueva
- Recalcular `total`
- Registrar historial

**`cambiarEstado(id, nuevoEstado, usuarioId, rol)`**

Transiciones permitidas:
```
pendiente   → confirmado  (solo admin)
pendiente   → cancelado   (usuario dueño o admin)
confirmado  → cancelado   (usuario dueño o admin)
confirmado  → entregado   (solo admin)
```
Cualquier otra → 400. Registrar historial.

**`obtenerResumen()`** (solo admin)
- Total de pedidos por estado
- Total recaudado (pedidos confirmados + entregados)
- Menú más pedido del día

**`obtenerHistorial(pedidoId, usuarioId, rol)`**
- Si rol `usuario` y el pedido no le pertenece → 403

### Criterios
- `total` siempre calculado en backend, nunca aceptar del body
- Historial automático en cada mutación (crear, editar, cambiar estado)

---

## Fase 7 — Validadores

**Archivos:** `validators/auth.validators.js`, `validators/pedidos.validators.js`

Exportar objetos de schema usables con el middleware `validate`:

```js
// auth.validators.js
export const registerSchema = { nombre, email, password }
export const loginSchema = { email, password }

// pedidos.validators.js
export const crearPedidoSchema = { menuId, fecha, cantidad, turnoEntrega, puntoRetiro }
export const editarPedidoSchema = { cantidad?, turnoEntrega?, puntoRetiro?, observaciones? }
```

---

## Fase 8 — Tests

**Archivos:** `tests/auth.test.js`, `tests/pedidos.test.js`

Usar `jest` + `supertest`. Cada test valida status HTTP y estructura del JSON.

| # | Test |
|---|---|
| 1 | Login correcto → 200 + token |
| 2 | Login inválido (password mal) → 401 |
| 3 | Listado pedidos con filtro de estado → 200 + array |
| 4 | Detalle pedido existente → 200 + objeto |
| 5 | Detalle pedido inexistente → 404 |
| 6 | Alta válida → 201 + pedido creado |
| 7 | Alta inválida — cantidad <= 0 → 400 |
| 8 | Alta inválida — sin cupo → 400 |
| 9 | Acceso a ruta protegida sin JWT → 401 |
| 10 | Confirmar pedido como usuario (no admin) → 403 |
| 11 | Edición que supera cupo → 400 |
| 12 | Edición de pedido entregado → 400 |

---

## Fase 9 — README

Documentar:
- Cómo instalar y ejecutar (`npm install`, `npm run init-db`, `npm run seed`, `npm run dev`)
- Credenciales del seed (admin y usuario)
- Tabla de endpoints
- Explicación del cálculo de cupos
- Flujo de estados
- JWT: payload, expiración, cómo enviarlo
- Roles y permisos
- Comando de tests (`npm test`)
- Limitaciones conocidas

---

## Orden de implementación recomendado

```
1. app.js + server.js + errorHandler.js
2. seedDb.js
3. auth (service → controller → route)
4. middlewares (auth, authorize, validate)
5. menus (service → controller → route)
6. pedidos (service → controller → route)
7. validators
8. tests
9. README
```
