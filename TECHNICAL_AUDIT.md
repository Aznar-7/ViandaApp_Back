# Auditoria tecnica del backend

Fecha: 2026-06-10

## Estado de remediacion

Corregido en esta iteracion:

- Transacciones SQLite serializadas y lecturas de mutacion dentro de transaccion.
- Updates de edicion/estado condicionados y verificados.
- Usuario activo y rol actual revalidados en cada request protegido.
- JWT con `issuer` y `audience`; secreto sin fallback inseguro.
- Emails normalizados y conflictos UNIQUE traducidos a `409`.
- IDs, fechas reales, enteros, filtros y campos desconocidos validados.
- CORS exige origins explicitos en produccion, valida URLs y soporta multiples
  frontends configurados desde entorno.
- El servidor inicializa/migra el esquema antes de escuchar, configura
  `trust proxy` por entorno y expone healthchecks para despliegues.
- Pedidos entregados consumen cupo y `menuDelDia` excluye cancelados.
- Fecha de negocio configurable, con default `America/Argentina/Buenos_Aires`.
- Indices compuestos para consultas principales.
- Tests aislados en `data/test.sqlite`, sin `--forceExit`, con cobertura de
  concurrencia, revocacion y validacion estricta.

Pendiente por requerir decisiones arquitectonicas o cambios de contrato:

- PostgreSQL para multiples instancias.
- Almacenamiento de objetos/CDN y CRUD administrativo para imagenes.
- Paginacion del historial y catalogo administrativo.
- Rate limiting distribuido, refresh tokens y revocacion avanzada.
- Migraciones versionadas, observabilidad y dinero en centavos/decimal.

## Resumen ejecutivo

El backend tiene una base razonable para un trabajo academico y un despliegue de
bajo trafico: separa rutas, controladores y servicios; usa queries parametrizadas,
JWT, bcrypt, Helmet, CORS restringido, validacion, transacciones para mutaciones,
WAL e indices basicos.

La consistencia concurrente dentro de una instancia fue endurecida y cubierta
por tests. No esta listo para escalar horizontalmente: siguen pendientes
PostgreSQL, paginacion de algunos listados, gestion externa de imagenes,
observabilidad y migraciones versionadas.

`npm audit --omit=dev` no reporto vulnerabilidades conocidas en dependencias al
momento de esta auditoria.

## Hallazgos prioritarios

### Corregido - Transacciones concurrentes sobre una conexion compartida

Archivos: `src/database/db.js`, `src/services/pedidos.service.js`

`getDb()` mantiene una unica conexion global y `withTransaction()` ejecuta
`BEGIN IMMEDIATE` sobre ella. Dos mutaciones concurrentes pueden intentar abrir
transacciones sobre la misma conexion y fallar con `cannot start a transaction
within a transaction`.

Ademas, `editarPedido()` y `cambiarEstado()` leen el pedido antes de abrir la
transaccion. Otro request puede cambiarlo entre la lectura y el `UPDATE`,
provocando actualizaciones perdidas o transiciones decididas con estado obsoleto.
`crearPedido()` tambien lee menu/precio/activo antes de la transaccion.

Implementado:

1. `withTransaction()` se serializa con una cola en proceso.
2. Las lecturas de mutaciones ocurren dentro de la transaccion.
3. Edicion y estados usan updates condicionales y verifican `changes`.
4. Para escala real todavia se debe migrar a PostgreSQL y bloquear filas con
   `SELECT ... FOR UPDATE` o usar control de concurrencia optimista.

### Alto - SQLite limita el escalado horizontal

Archivos: `src/database/db.js`, `src/config/env.js`

WAL mejora lecturas concurrentes, pero SQLite sigue teniendo un solo writer. El
archivo local tampoco puede compartirse de forma segura entre varias instancias
de aplicacion. `busy_timeout` reduce errores transitorios, pero no cambia ese
limite arquitectonico.

Accion recomendada: mantener SQLite para desarrollo/demo y definir PostgreSQL
como objetivo antes de desplegar multiples replicas.

### Corregido - Sesiones JWT no reflejan cambios de usuario

Archivos: `src/middlewares/authenticate.js`, `src/services/auth.service.js`

El middleware confia durante 8 horas en `id` y `rol` firmados. Si un usuario se
desactiva o pierde rol, un token emitido previamente sigue autorizado hasta
expirar.

El middleware consulta estado y rol actual en cada request protegido y verifica
`iss` y `aud`. Quedan como evolucion tokens de acceso mas cortos, refresh token
rotativo y una estrategia de revocacion/version de sesion.

### Alto - Imagenes locales sin flujo administrativo

Archivos: `src/app.js`, `src/database/initDb.js`, `src/database/seedDb.js`

El contrato `imagenUrl` y `/assets` sirve para desarrollo y una sola instancia,
pero el archivo local no escala horizontalmente. Tampoco existe CRUD de menus ni
upload, por lo que hoy la asociacion se administra fuera de la API.

Accion recomendada: al crear el modulo admin de menus, subir imagenes directamente
a almacenamiento de objetos mediante URLs firmadas. Validar MIME real, tamano,
dimensiones y nombre; generar variantes optimizadas y guardar solamente la URL.

### Alto - Listados sin paginacion pueden crecer sin limite

Archivos: `src/services/menus.service.js`, `src/services/pedidos.service.js`

Menus e historial devuelven todos los registros coincidentes. El historial puede
crecer indefinidamente. El listado de menus agrega pedidos para calcular cupo en
cada request.

Accion recomendada: paginar historial y menus administrativos. Para menus
publicos, limitar por ventana de fechas. Si el volumen crece, mantener cupo
reservado de forma transaccional o precalculada.

## Performance

### Consultas e indices

Los indices actuales cubren columnas individuales de pedidos, pero las consultas
reales combinan filtros y orden:

- Listado usuario: `usuarioId`, opcionalmente `estado`/`fecha`, luego orden.
- Cupo: `menuId`, `fecha` y `estado`.
- Historial: `pedidoId` ordenado por `fechaHora`.

Indices candidatos, a validar con datos reales y `EXPLAIN QUERY PLAN`:

```sql
CREATE INDEX idx_pedidos_menu_fecha_estado
ON pedidos(menuId, fecha, estado);

CREATE INDEX idx_pedidos_usuario_fecha
ON pedidos(usuarioId, fecha DESC);

CREATE INDEX idx_historial_pedido_fecha
ON historial_pedidos(pedidoId, fechaHora);
```

No conviene agregar todos los indices posibles: cada indice encarece inserts y
updates. Primero medir p95/p99 y planes de ejecucion con volumen representativo.

### Resumen administrativo

`obtenerResumen()` hace agregaciones completas en cada request. Es aceptable con
pocos pedidos. Con volumen alto conviene cachear por pocos segundos, calcular por
rango temporal y/o mantener metricas agregadas.

### Imagenes

Los assets tienen cache de un dia, pero Express no reemplaza a un CDN. En
produccion conviene servir WebP/AVIF, variantes por tamano, cache inmutable con
hash en nombre y CDN.

## Seguridad

### Controles correctos existentes

- Queries parametrizadas para valores provistos por clientes.
- Lista permitida para la columna dinamica de orden.
- Passwords con bcrypt y hash fuera de responses.
- Helmet, CORS configurable y limite JSON de `10kb`.
- Rate limit en login/registro.
- Errores internos sin stack para el cliente.

### Mejoras necesarias

- El rate limiter usa memoria local: no comparte conteos entre replicas y se
  reinicia con el proceso. Usar Redis al escalar y configurar correctamente
  `trust proxy` detras de un reverse proxy.
- Normalizar email (`trim` + lowercase) y aplicar unicidad case-insensitive. El
  chequeo previo al insert tiene carrera; mapear la violacion UNIQUE a `409`.
- Validar IDs como enteros positivos, cantidades como enteros y fechas reales,
  no solo strings con forma `YYYY-MM-DD`.
- Rechazar campos desconocidos en bodies para detectar errores del frontend y
  reducir mass-assignment futuro.
- Aplicar rate limits generales y especificos a mutaciones costosas.
- `JWT_SECRET` ya no tiene fallback inseguro y el servidor rechaza el arranque
  cuando no esta configurado.
- Definir politica de logs: no registrar tokens, passwords, PII innecesaria ni
  stacks completos en produccion sin control de acceso.

## Mantenibilidad

### Fortalezas

- Capas claras: rutas, controladores, servicios y persistencia.
- Errores operativos centralizados.
- Helpers internos para obtener pedidos e historial.
- Tests de integracion sobre los flujos principales.

### Deuda tecnica

- La migracion actual es idempotente, pero no esta versionada. Adoptar una tabla
  `schema_migrations` y archivos de migracion incrementales antes de sumar mas
  cambios de esquema.
- Los enums y reglas aparecen repetidos entre esquema SQL, validadores,
  controladores y servicios. Centralizar constantes de dominio.
- El middleware de validacion casero no expresa objetos complejos, coercion,
  campos desconocidos o validacion cruzada. Adoptar Zod, Joi o JSON Schema.
- Los tests usan una base aislada y cierran recursos sin `--forceExit`.
- El seed sale si existe cualquier usuario; una base parcialmente sembrada no se
  repara. Separar fixtures de desarrollo de migraciones y hacer seeds
  idempotentes por entidad.
- Hay texto con mojibake visible en varios archivos. Normalizar el repositorio a
  UTF-8 evita mensajes corruptos y diffs confusos.

## Correctitud de negocio

- Los pedidos `entregado` ahora consumen cupo.
- `menuDelDia` ahora excluye pedidos cancelados.
- El dinero se guarda como `REAL`; para evitar errores de punto flotante, guardar
  centavos como entero o usar un tipo decimal al migrar de base.
- La fecha del resumen usa `BUSINESS_TIME_ZONE`, con default
  `America/Argentina/Buenos_Aires`.

## Hoja de ruta sugerida

### Antes de sumar mas funcionalidades

1. Definir paginacion para historial y catalogo administrativo.
2. Adoptar migraciones versionadas.
3. Confirmar estrategia de dinero en centavos o decimal.
4. Normalizar los archivos restantes del repositorio a UTF-8.

### Antes de produccion

1. Migrar a PostgreSQL.
2. Incorporar migraciones versionadas.
3. Implementar observabilidad: logs estructurados, request ID, metricas y alertas.
4. Usar almacenamiento de objetos/CDN para imagenes.
5. Endurecer sesiones, rate limiting distribuido y manejo de secretos.

### Cuando el volumen lo justifique

1. Medir latencia p95/p99 y consultas lentas.
2. Agregar indices compuestos validados con planes de ejecucion.
3. Cachear resumen y catalogo de menus.
4. Ejecutar pruebas de carga y concurrencia sobre creacion/edicion de pedidos.
