# Informe de integracion Frontend - Viandas API

Este documento describe el contrato actual del backend para su consumo desde frontend.

## Configuracion general

- URL local: `http://localhost:3000`
- Prefijo de la API: `/api`
- Formato de request y response: JSON
- Header para requests con body: `Content-Type: application/json`
- Limite del body: `10kb`
- Origen permitido por defecto: `http://localhost:5173`
- Imagenes publicas: `http://localhost:3000/assets/<archivo>`

En produccion, el backend requiere `CORS_ORIGIN` con la URL publica exacta del
frontend. Se pueden configurar varios origins separados por coma. Un frontend no
incluido puede recibir la respuesta HTTP, pero el navegador no le permite leerla
porque el backend omite `Access-Control-Allow-Origin`.

Healthchecks publicos:

```http
GET /
GET /api/health
```

`GET /api/health` responde `200` solamente cuando la API puede consultar la base.

Todos los endpoints de pedidos requieren:

```http
Authorization: Bearer <token>
```

El token se obtiene al iniciar sesion, contiene `id`, `email` y `rol`, y expira en 8 horas.

## Formato comun de errores

Los errores controlados devuelven:

```json
{
  "error": "Descripcion del error"
}
```

Codigos posibles:

| Codigo | Uso |
|---|---|
| `400` | Body invalido, filtro invalido o regla de negocio incumplida |
| `401` | Credenciales invalidas, token ausente, invalido o expirado |
| `403` | Usuario inactivo, rol insuficiente o acceso a un pedido ajeno |
| `404` | Ruta, menu o pedido inexistente |
| `409` | Conflicto por email duplicado o modificacion concurrente |
| `429` | Mas de 20 intentos de login/registro en 15 minutos |
| `500` | Error interno no controlado |

La validacion puede agrupar varios errores en un solo string separado por ` | `.

```json
{
  "error": "\"email\" tiene un formato invalido | \"password\" es obligatorio"
}
```

## Modelos de respuesta

SQLite devuelve `activo` como numero (`1` o `0`), no como booleano.

### Usuario

```json
{
  "id": 1,
  "nombre": "Admin",
  "email": "admin@viandas.com",
  "rol": "admin",
  "activo": 1
}
```

Valores de `rol`: `usuario`, `admin`.

### Menu

```json
{
  "id": 3,
  "nombre": "Bowl vegano",
  "descripcion": "Bowl de quinoa con vegetales asados",
  "fecha": "2026-06-10",
  "tipo": "vegano",
  "precio": 1000,
  "cupoDiario": 8,
  "activo": 1,
  "imagenUrl": "/assets/mondongo.jpg",
  "cupoDisponible": 5
}
```

Valores de `tipo`: `clasico`, `vegetariano`, `vegano`, `sin_tacc`.

`imagenUrl` es una URL relativa nullable. Para mostrarla, concatenar el origen del
backend, por ejemplo: `http://localhost:3000${menu.imagenUrl}`. Si llega `null`,
el frontend debe mostrar un placeholder.

Para sincronizar las rutas de imagen en una base ya sembrada:

```bash
npm run sync-menu-images
```

Para sincronizar todo el catalogo seed e insertar menús faltantes:

```bash
npm run sync-menus
```

### Pedido

```json
{
  "id": 5,
  "menuId": 3,
  "usuarioId": 2,
  "fecha": "2026-06-10",
  "cantidad": 2,
  "turnoEntrega": "almuerzo",
  "puntoRetiro": "Sede central",
  "total": 2000,
  "estado": "pendiente",
  "observaciones": null,
  "menuNombre": "Bowl vegano",
  "usuarioNombre": "Juan Perez"
}
```

Valores de `turnoEntrega`: `almuerzo`, `cena`.

Valores de `estado`: `pendiente`, `confirmado`, `cancelado`, `entregado`.

## Autenticacion

Las rutas de autenticacion son publicas. Registro y login comparten un limite de 20 requests por IP cada 15 minutos.

### Registrar usuario

`POST /api/auth/register`

Body:

```json
{
  "nombre": "Ana Perez",
  "email": "ana@example.com",
  "password": "secreto123"
}
```

Validaciones:

- `nombre`: string obligatorio, entre 2 y 100 caracteres.
- `email`: string obligatorio con formato de email.
- `password`: string obligatorio, entre 6 y 72 caracteres.
- El email debe ser unico.
- El backend normaliza nombre y email; el email se guarda en minusculas.
- Los campos no documentados son rechazados.
- Todo usuario registrado desde este endpoint recibe rol `usuario`.

Response `201`:

```json
{
  "id": 4,
  "nombre": "Ana Perez",
  "email": "ana@example.com",
  "rol": "usuario",
  "activo": 1
}
```

Error relevante: `409` con `El email ya esta registrado`.

### Iniciar sesion

`POST /api/auth/login`

Body:

```json
{
  "email": "ana@example.com",
  "password": "secreto123"
}
```

Response `200`:

```json
{
  "token": "<jwt>",
  "usuario": {
    "id": 4,
    "nombre": "Ana Perez",
    "email": "ana@example.com",
    "rol": "usuario",
    "activo": 1
  }
}
```

Errores relevantes:

- `401`: `Credenciales invalidas`.
- `403`: `Usuario inactivo`.

El frontend debe persistir `token` y `usuario`, adjuntar el token a pedidos y cerrar la sesion cuando reciba un `401`.
El backend revalida que el usuario siga activo y usa su rol actual en cada request protegido.

## Menus

### Listar menus

`GET /api/menus`

Ruta publica. Devuelve directamente un array de menus.

Query params opcionales:

| Parametro | Ejemplo | Comportamiento |
|---|---|---|
| `tipo` | `vegano` | Filtra por tipo exacto |
| `fecha` | `2026-06-10` | Filtra por fecha exacta |
| `activo` | `0` o `1` | Por defecto devuelve solo activos (`1`) |

Valores invalidos de `tipo`, `fecha` o `activo` devuelven `400`.

Ejemplo:

```http
GET /api/menus?fecha=2026-06-10&tipo=vegano
```

Response `200`:

```json
[
  {
    "id": 3,
    "nombre": "Bowl vegano",
    "descripcion": "Bowl de quinoa con vegetales asados",
    "fecha": "2026-06-10",
    "tipo": "vegano",
    "precio": 1000,
    "cupoDiario": 8,
    "activo": 1,
    "imagenUrl": "/assets/mondongo.jpg",
    "cupoDisponible": 5
  }
]
```

`cupoDisponible` descuenta pedidos `pendiente`, `confirmado` y `entregado`.
Las imagenes se sirven con cache HTTP por 1 dia y permiten carga cross-origin.

## Pedidos

Todas las rutas de esta seccion requieren JWT.

- Un `usuario` solo puede ver y operar sus propios pedidos.
- Un `admin` puede ver y operar pedidos de cualquier usuario.

### Listar pedidos

`GET /api/pedidos`

Query params opcionales:

| Parametro | Valores | Default |
|---|---|---|
| `estado` | `pendiente`, `confirmado`, `cancelado`, `entregado` | todos |
| `fecha` | fecha exacta, normalmente `YYYY-MM-DD` | todas |
| `page` | numero desde `1` | `1` |
| `limit` | numero, maximo `100` | `10` |
| `order` | `fecha`, `estado`, `total` | `fecha` |

El orden siempre es descendente.

Ejemplo:

```http
GET /api/pedidos?estado=pendiente&page=1&limit=10&order=fecha
```

Response `200`:

```json
{
  "pedidos": [
    {
      "id": 5,
      "menuId": 3,
      "usuarioId": 2,
      "fecha": "2026-06-10",
      "cantidad": 2,
      "turnoEntrega": "almuerzo",
      "puntoRetiro": "Sede central",
      "total": 2000,
      "estado": "pendiente",
      "observaciones": null,
      "menuNombre": "Bowl vegano",
      "usuarioNombre": "Juan Perez"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

Errores relevantes:

- `400` si `estado` u `order` no pertenecen a los valores permitidos.

### Obtener detalle

`GET /api/pedidos/:id`

Response `200`: un objeto `Pedido`.

Errores relevantes:

- `403`: el pedido pertenece a otro usuario.
- `404`: `Pedido no encontrado`.

### Crear pedido

`POST /api/pedidos`

Body:

```json
{
  "menuId": 3,
  "fecha": "2026-06-10",
  "cantidad": 2,
  "turnoEntrega": "almuerzo",
  "puntoRetiro": "Sede central",
  "observaciones": "Sin cubiertos"
}
```

Validaciones:

- `menuId`: number obligatorio.
- `fecha`: string obligatorio que represente una fecha real con formato `YYYY-MM-DD`.
- `cantidad`: number entero obligatorio, minimo `1`.
- `turnoEntrega`: obligatorio, `almuerzo` o `cena`.
- `puntoRetiro`: string obligatorio, entre 2 y 200 caracteres.
- `observaciones`: string opcional, maximo 500 caracteres.

Reglas:

- El menu debe existir, estar activo y corresponder exactamente a `fecha`.
- Debe existir cupo suficiente.
- El backend asigna el usuario autenticado.
- El backend calcula `total = precio * cantidad`.
- El estado inicial siempre es `pendiente`.
- Se registra automaticamente una entrada de historial.

Response `201`: el `Pedido` creado.

Errores relevantes:

- `404`: `Menu no encontrado`.
- `400`: menu inactivo, fecha incorrecta o cupo insuficiente.

### Editar pedido

`PUT /api/pedidos/:id`

Body: enviar al menos uno de estos campos.

```json
{
  "cantidad": 3,
  "turnoEntrega": "cena",
  "puntoRetiro": "Sede norte",
  "observaciones": "Retira otra persona"
}
```

Reglas:

- Solo se editan pedidos `pendiente` o `confirmado`.
- Un usuario solo edita pedidos propios.
- Si cambia `cantidad`, se revalida el cupo.
- El backend recalcula el total.
- No se pueden cambiar `menuId`, `fecha`, `usuarioId`, `estado` ni `total`.
- Se registra automaticamente el cambio en el historial.

Response `200`: el `Pedido` actualizado.

Errores relevantes:

- `400`: body sin campos editables, pedido en estado no editable o cupo insuficiente.
- `403`: pedido ajeno.
- `404`: pedido inexistente.

### Cancelar pedido

`PATCH /api/pedidos/:id/cancelar`

Sin body. Permitido para admin o usuario dueno cuando el pedido esta `pendiente` o `confirmado`.

Response `200`: el `Pedido` actualizado con estado `cancelado`.

### Confirmar pedido

`PATCH /api/pedidos/:id/confirmar`

Sin body. Solo admin. Unicamente permite `pendiente -> confirmado`.

Response `200`: el `Pedido` actualizado con estado `confirmado`.

### Marcar pedido como entregado

`PATCH /api/pedidos/:id/entregar`

Sin body. Solo admin. Unicamente permite `confirmado -> entregado`.

Response `200`: el `Pedido` actualizado con estado `entregado`.

Errores comunes de cambios de estado:

- `400`: transicion no permitida.
- `403`: rol insuficiente o pedido ajeno.
- `404`: pedido inexistente.

### Obtener historial

`GET /api/pedidos/:id/historial`

Un usuario accede solo al historial de sus pedidos; admin accede a cualquiera.

Response `200`:

```json
[
  {
    "id": 20,
    "pedidoId": 5,
    "usuarioId": 2,
    "accion": "edicion",
    "fechaHora": "2026-06-10T14:30:00.000Z",
    "valorAnterior": {
      "cantidad": 2,
      "turnoEntrega": "almuerzo",
      "puntoRetiro": "Sede central",
      "total": 2000
    },
    "valorNuevo": {
      "cantidad": 3,
      "turnoEntrega": "cena",
      "puntoRetiro": "Sede norte",
      "total": 3000
    },
    "usuarioNombre": "Juan Perez"
  }
]
```

Posibles valores de `accion`:

- `creacion`
- `edicion`
- `estado:pendiente->confirmado`
- `estado:pendiente->cancelado`
- `estado:confirmado->cancelado`
- `estado:confirmado->entregado`

`valorAnterior` y `valorNuevo` ya llegan parseados como objeto o `null`.

### Obtener resumen administrativo

`GET /api/pedidos/resumen`

Solo admin.

Response `200`:

```json
{
  "porEstado": [
    {
      "estado": "pendiente",
      "cantidad": 5,
      "totalMonto": 9850
    }
  ],
  "recaudado": 7500,
  "menuDelDia": {
    "nombre": "Bowl vegano",
    "totalPedido": 3
  }
}
```

Consideraciones:

- `porEstado` solo incluye estados que tengan al menos un pedido.
- `recaudado` suma pedidos `confirmado` y `entregado`.
- `menuDelDia` usa la fecha actual del servidor y puede ser `null`.
- `menuDelDia` excluye pedidos cancelados.

## Flujo de estados

```text
pendiente  -> confirmado  (admin)
pendiente  -> cancelado   (admin o usuario dueno)
confirmado -> cancelado   (admin o usuario dueno)
confirmado -> entregado   (admin)
```

`cancelado` y `entregado` son estados finales.

Los pedidos `pendiente`, `confirmado` y `entregado` consumen cupo. Los pedidos `cancelado` no consumen cupo.

## Flujos sugeridos para frontend

### Sesion

1. Registrar o iniciar sesion.
2. Guardar `token` y `usuario`.
3. Configurar un interceptor para enviar `Authorization: Bearer <token>`.
4. Ante cualquier `401`, limpiar la sesion y redirigir a login.
5. Mostrar opciones administrativas solo cuando `usuario.rol === "admin"`.

### Crear pedido

1. Consultar menus activos por fecha con `GET /api/menus?fecha=YYYY-MM-DD`.
2. Deshabilitar menus con `cupoDisponible < 1`.
3. Enviar el pedido sin `total`, `estado` ni `usuarioId`.
4. Usar el pedido devuelto por el `201` como fuente final de datos.

### Gestion de usuario

1. Listar `GET /api/pedidos`; el backend devuelve solo pedidos propios.
2. Permitir editar pedidos `pendiente` o `confirmado`.
3. Permitir cancelar pedidos `pendiente` o `confirmado`.
4. Mostrar detalle e historial.

### Gestion administrativa

1. Listar todos los pedidos y aplicar filtros.
2. Confirmar pedidos `pendiente`.
3. Entregar pedidos `confirmado`.
4. Cancelar pedidos `pendiente` o `confirmado`.
5. Consultar `/api/pedidos/resumen`.

## Observaciones del contrato actual

- No existe endpoint para crear, editar o eliminar menus.
- No existe upload de imagenes; `imagenUrl` se administra actualmente desde datos
  semilla o base de datos.
- Las imagenes viven en disco local. Para multiples instancias se debe migrar a
  almacenamiento de objetos y CDN.
- No existe endpoint para obtener el usuario actual; la identidad se toma del response de login.
- No existen refresh tokens.
- Los filtros de menus no tienen validacion explicita; conviene enviar solo valores documentados.
- Las fechas son strings y el backend espera `YYYY-MM-DD` al crear pedidos.
- Los campos extra enviados en bodies son rechazados con `400`.
- Para evitar inconsistencias visuales, usar siempre el pedido devuelto por cada mutacion.
