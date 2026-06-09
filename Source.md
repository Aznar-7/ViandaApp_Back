# TP previo Parcial 2 - DDS 2026 (Curso 3K2)

## Información general

- **Materia:** Desarrollo de Software (DDS)
- **Año:** 2026
- **Instancia:** TP previo al Parcial 2
- **Curso:** 3K2

## Introducción

Desde la publicación de la tarea hasta el **13/06 a las 23:55 hs**, cada grupo de entre **2 y 5 alumnos** deberá desarrollar una aplicación **full stack** para gestionar pedidos de viandas con cupos diarios.

Además, cada alumno deberá subir el trabajo realizado a su portafolio.

Entre el **14/06 a las 10:00 hs** y el **15/06 a las 23:55 hs**, otro grupo realizará una **revisión entre pares** y entregará una devolución grupal.

Estas tareas son obligatorias y servirán como base para preguntas del segundo parcial.

---

# Alcance mínimo de resolución grupal

La entrega debe incluir:

- Módulo de autenticación completo (registro, login, JWT, roles y persistencia de sesión).
- Módulo principal del dominio con listado, filtros, detalle, alta, edición y cambios de estado.
- Módulo administrativo o de resumen.
- Validaciones de negocio implementadas en backend.
- Al menos dos flujos end-to-end completos.
- Pruebas automatizadas.
- Documentación suficiente para que otro grupo pueda ejecutar y comprender la solución.

No se consideran suficientes:

- Pantallas sin backend real.
- Endpoints sin frontend integrado.
- Datos hardcodeados.
- Reglas de negocio implementadas únicamente en la interfaz.

---

# Sistema a desarrollar

Aplicación web full stack para gestionar pedidos de viandas.

La aplicación debe permitir:

- Usuarios autenticados que soliciten menús.
- Administradores que gestionen cupos, estados y entregas.
- Control de stock diario por menú.
- Validaciones de disponibilidad.

---

# Dominio obligatorio

El recurso principal es **Pedido**.

Cada pedido:

- Debe estar asociado a un menú.
- Debe respetar disponibilidad.
- Consume cupo diario.

## Regla central

Un pedido solo puede crearse o modificarse si:

1. El menú existe.
2. Está activo.
3. Está disponible para la fecha solicitada.
4. Tiene cupo suficiente.

### Cálculo del cupo

```text
cupoDisponible =
cupoDiario - Σ(cantidades de pedidos pendientes y confirmados)
```

---

# Entidades obligatorias

## Usuario

| Campo | Tipo | Obligatorio | Descripción |
|---------|---------|---------|---------|
| id | string/number | Sí | Identificador único |
| nombre | string | Sí | Nombre visible |
| email | string | Sí | Único |
| passwordHash | string | Sí | Contraseña hasheada |
| rol | string | Sí | usuario / admin |
| activo | boolean | Sí | Habilita acceso |

## Menú

| Campo | Tipo | Obligatorio | Descripción |
|---------|---------|---------|---------|
| id | string/number | Sí | Identificador |
| nombre | string | Sí | Nombre del menú |
| descripcion | string | Sí | Descripción |
| fecha | date/string | Sí | Fecha disponible |
| tipo | string | Sí | clasico, vegetariano, vegano, sin_tacc |
| precio | number | Sí | Precio unitario |
| cupoDiario | number | Sí | Stock máximo |
| activo | boolean | Sí | Acepta pedidos |

## Pedido

| Campo | Tipo | Obligatorio | Descripción |
|---------|---------|---------|---------|
| id | string/number | Sí | Identificador |
| menuId | string/number | Sí | Menú asociado |
| usuarioId | string/number | Sí | Usuario solicitante |
| fecha | date/string | Sí | Fecha de entrega |
| cantidad | number | Sí | Cantidad solicitada |
| turnoEntrega | string | Sí | almuerzo / cena |
| puntoRetiro o direccionEntrega | string | Sí | Lugar de entrega |
| total | number | Sí | Calculado en backend |
| estado | string | Sí | pendiente, confirmado, cancelado, entregado |
| observaciones | string | No | Comentarios |

## HistorialPedido

| Campo | Tipo | Obligatorio | Descripción |
|---------|---------|---------|---------|
| id | string/number | Sí | Identificador |
| pedidoId | string/number | Sí | Pedido afectado |
| usuarioId | string/number | Sí | Usuario que realizó la acción |
| accion | string | Sí | Operación realizada |
| fechaHora | datetime/string | Sí | Momento de la acción |
| valorAnterior | object/string | No | Estado previo |
| valorNuevo | object/string | No | Estado posterior |

---

# Reglas funcionales

1. Registro de usuario.
2. Login.
3. Obtención de JWT.
4. Listado con filtros.
5. Detalle de pedido.
6. Crear pedido.
7. Editar pedido.
8. Cancelar pedido.
9. Confirmar o entregar solo como administrador.
10. Rechazar cantidades <= 0.
11. Rechazar pedidos que superen el cupo.

---

# Complejidad adicional obligatoria

1. Flujo de estados:

```text
pendiente -> confirmado
pendiente -> cancelado
confirmado -> cancelado
confirmado -> entregado
```

2. Paginación y ordenamiento.
3. Resumen administrativo.
4. Historial de cambios.
5. Cálculo de total en backend.
6. Revalidación de cupos al editar.
7. Datos semilla:
   - 6 menús
   - 2 usuarios
   - 1 administrador
   - 12 pedidos
8. Mensajes de error específicos.

---

# Roles y permisos

## Usuario

Puede:

- Crear pedidos.
- Ver sus pedidos.
- Cancelar pedidos propios pendientes o confirmados.

## Administrador

Puede:

- Ver todos los pedidos.
- Confirmar pedidos.
- Cancelar pedidos.
- Marcar entregas.
- Administrar estados.

## Códigos HTTP obligatorios

| Código | Significado |
|----------|----------|
| 200 | OK |
| 201 | Creado |
| 400 | Error de validación |
| 401 | Sin JWT |
| 403 | Sin permisos |
| 404 | No encontrado |
| 500 | Error interno |

---

# Backend esperado

## Tecnologías

- Node.js
- Express

## Endpoints mínimos

```http
POST   /api/auth/register
POST   /api/auth/login

GET    /api/menus

GET    /api/pedidos
GET    /api/pedidos/resumen
GET    /api/pedidos/:id
GET    /api/pedidos/:id/historial

POST   /api/pedidos
PUT    /api/pedidos/:id

PATCH  /api/pedidos/:id/cancelar
PATCH  /api/pedidos/:id/confirmar
PATCH  /api/pedidos/:id/entregar
```

## Estructura mínima

- routes/pedidos.routes.js
- Controlador de pedidos
- Servicio de pedidos
- Middleware JWT
- Middleware de autorización
- Middleware de validación
- Middleware de errores
- Persistencia
- Datos semilla

---

# Frontend esperado

## Tecnologías

- React
- Vite
- Axios
- React Router

## Pantallas mínimas

1. Login.
2. Registro.
3. Listado de pedidos.
4. Detalle de pedido.
5. Alta/edición.
6. Resumen administrativo.
7. Historial.
8. Página 404.

## Axios

- baseURL
- params
- Authorization: Bearer <token>
- Manejo de errores

---

# Integración y calidad

Se espera:

- Context/AuthProvider.
- Rutas protegidas.
- Validaciones frontend y backend.
- Servicios Axios separados.
- JWT sin información sensible.
- Manejo centralizado de errores.
- README documentado.

---

# Testing obligatorio

Pruebas con Jest y Supertest:

1. Login correcto.
2. Login inválido.
3. Listado con filtros.
4. Detalle existente.
5. Detalle inexistente.
6. Alta válida.
7. Alta inválida por cantidad.
8. Alta inválida por cupo.
9. Acceso sin JWT.
10. Acceso con rol insuficiente.
11. Edición inválida por cupo.
12. Edición de pedido entregado.

Todas las pruebas deben validar:

- Status HTTP.
- JSON de respuesta.

---

# README obligatorio

Debe incluir:

- Instrucciones de ejecución.
- Usuario administrador.
- Usuario común.
- Endpoints principales.
- Rutas frontend.
- Explicación del cálculo de cupos.
- JWT, roles y permisos.
- Comando de testing.
- Limitaciones conocidas.

---

# Entrega

Subir:

- Código fuente.
- package.json
- Tests.
- README.
- Repositorio o archivo comprimido.

**No incluir `node_modules`.**
