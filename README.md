# Viandas Back

Backend para el sistema de gestión de pedidos de viandas con cupos diarios.
Node.js · Express · SQLite · JWT

---

## Requisitos

- Node.js 18+
- npm

---

## Instalación y ejecución

```bash
npm install
npm run init-db
npm run seed
npm run dev
```

El servidor queda en `http://localhost:3000`.

Para producción: `npm start`

---

## Variables de entorno

Archivo `.env` en la raíz del proyecto:

```env
PORT=3000
JWT_SECRET=tu_clave_secreta
DB_FILE=./data/database.sqlite
```

---

## Credenciales del seed

| Rol | Email | Password |
|---|---|---|
| Administrador | admin@viandas.com | admin123 |
| Usuario | juan@viandas.com | user123 |
| Usuario | maria@viandas.com | user123 |

El seed carga además 6 menús y 12 pedidos distribuidos en todos los estados.

---

## Endpoints

### Autenticación (público)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Login → devuelve JWT |

**Body register:**
```json
{ "nombre": "string", "email": "string", "password": "string" }
```

**Body login:**
```json
{ "email": "string", "password": "string" }
```

---

### Menús (público)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/menus` | Listar menús con cupo disponible calculado |

**Query params opcionales:** `tipo`, `fecha`, `activo`

---

### Pedidos (requiere JWT)

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/api/pedidos` | admin, usuario | Listar pedidos paginados |
| GET | `/api/pedidos/resumen` | admin | Resumen por estado y recaudación |
| GET | `/api/pedidos/:id` | admin, usuario | Detalle de un pedido |
| GET | `/api/pedidos/:id/historial` | admin, usuario | Historial de cambios del pedido |
| POST | `/api/pedidos` | admin, usuario | Crear pedido |
| PUT | `/api/pedidos/:id` | admin, usuario | Editar pedido |
| PATCH | `/api/pedidos/:id/cancelar` | admin, usuario | Cancelar pedido |
| PATCH | `/api/pedidos/:id/confirmar` | admin | Confirmar pedido |
| PATCH | `/api/pedidos/:id/entregar` | admin | Marcar como entregado |

**Query params para `GET /api/pedidos`:** `estado`, `fecha`, `page`, `limit`, `order`

El usuario solo puede ver y modificar sus propios pedidos. El admin ve todos.

---

## JWT

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

- Expiración: **8 horas**
- No incluye `passwordHash` ni datos sensibles

**Cómo enviarlo en cada request:**
```
Authorization: Bearer <token>
```

---

## Roles y permisos

### Usuario
- Crear pedidos propios
- Ver sus pedidos y el historial
- Cancelar y editar sus pedidos en estado `pendiente` o `confirmado`

### Administrador
- Todo lo anterior sobre cualquier pedido
- Confirmar pedidos (`pendiente → confirmado`)
- Marcar como entregados (`confirmado → entregado`)
- Ver el resumen administrativo

---

## Flujo de estados

```
pendiente ──► confirmado ──► entregado
    │               │
    └───────────────┴──► cancelado
```

| Transición | Quién puede ejecutarla |
|---|---|
| `pendiente → confirmado` | Admin |
| `pendiente → cancelado` | Admin, Usuario dueño |
| `confirmado → cancelado` | Admin, Usuario dueño |
| `confirmado → entregado` | Admin |

Cualquier otra transición devuelve **400**.

---

## Cálculo de cupos

```
cupoDisponible = cupoDiario − Σ(cantidades de pedidos en estado pendiente o confirmado)
```

- Los pedidos `cancelado` y `entregado` **no consumen cupo**
- Al **crear** un pedido se valida contra el cupo disponible
- Al **editar** la cantidad, el pedido actual se excluye del conteo para no contarse dos veces
- El campo `total` siempre lo calcula el backend como `precio × cantidad`. El cliente no puede enviarlo

---

## Testing

Los tests requieren base de datos inicializada con datos semilla:

```bash
npm run init-db
npm run seed
npm test
```

**12 tests** (Jest + Supertest):

| # | Caso | Status esperado |
|---|---|---|
| 1 | Login correcto | 200 |
| 2 | Login con password inválida | 401 |
| 3 | Listado de pedidos con filtro de estado | 200 |
| 4 | Detalle de pedido existente | 200 |
| 5 | Detalle de pedido inexistente | 404 |
| 6 | Alta válida | 201 |
| 7 | Alta con cantidad ≤ 0 | 400 |
| 8 | Alta sin cupo disponible | 400 |
| 9 | Acceso a ruta protegida sin JWT | 401 |
| 10 | Confirmar pedido como usuario (sin permisos) | 403 |
| 11 | Edición que supera el cupo disponible | 400 |
| 12 | Edición de pedido en estado entregado | 400 |

Los tests limpian los datos que crean → son repetibles.

---

## Estructura del proyecto

```
src/
├── config/
│   └── env.js                  Variables de entorno
├── database/
│   ├── db.js                   Conexión SQLite (singleton)
│   ├── initDb.js               Creación de tablas
│   └── seedDb.js               Datos de prueba
├── middlewares/
│   ├── authenticate.js         Verificación JWT → req.user
│   ├── authorize.js            Control de roles
│   ├── errorHandler.js         Manejo centralizado de errores
│   └── validate.js             Validación de body por schema
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

## Códigos HTTP

| Código | Significado |
|---|---|
| 200 | OK |
| 201 | Recurso creado |
| 400 | Error de validación o regla de negocio |
| 401 | Token ausente o inválido |
| 403 | Sin permisos para la operación |
| 404 | Recurso no encontrado |
| 500 | Error interno del servidor |

---

## Limitaciones conocidas

- SQLite es un archivo local: no apto para múltiples instancias del servidor corriendo en paralelo.
- No hay refresh token: al expirar el JWT (8h) el usuario debe hacer login nuevamente.
- Los menús no tienen CRUD desde la API: se gestionan mediante el seed.
- Los tests comparten la base de datos de desarrollo. Ejecutar `npm run seed` antes de `npm test` es obligatorio.
