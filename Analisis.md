Análisis de la codebase — Viandas Back

  ---
  🔴 Crítico — Seguridad y consistencia de datos

  1. Race condition en el cupo (pedidos.service.js:112-121)
  El flujo calcularCupoDisponible → INSERT no está en una transacción. Dos requests simultáneos pueden pasar ambos el chequeo de cupo y ambos insertar, resultando en sobre-booking. Solución: envolver todo crearPedido y editarPedido en db.run("BEGIN") /
  db.run("COMMIT").

  2. No hay transacciones en ninguna mutación
  crearPedido, editarPedido y cambiarEstado hacen múltiples writes (pedido + historial, o UPDATE + historial). Si el segundo write falla, el primero ya se aplicó y los datos quedan inconsistentes. Sin transacciones, el historial puede quedar huérfano o al
  revés.

  3. JWT_SECRET con fallback débil (env.js:4)
  export const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
  Si .env no existe o no incluye JWT_SECRET, el app corre con una clave trivialmente conocida. Cualquiera puede forjar tokens. Solución: lanzar un error al inicio si no está definido.

  4. Sin rate limiting en auth
  POST /api/auth/login no tiene throttling. Permite brute force ilimitado sobre contraseñas. Con express-rate-limit se resuelve en 5 líneas.

  ---
  🟠 Alto — Correctitud y seguridad

  5. Enums no validados en la capa HTTP (pedidos.validators.js)
  turnoEntrega: { type: "string" } acepta cualquier string. Si se envía "medianoche", pasa el validator, llega al servicio, y SQLite rechaza con un SQLITE_CONSTRAINT que el errorHandler convierte en 500 en vez de 400. Lo mismo para tipo en menús. Solución:
  agregar enum: ["almuerzo", "cena"] al schema de validación.

  6. Sin validación de formato de email ni largo de password
  email: { type: "string" } acepta "hola" como email válido. password: { type: "string" } acepta "a". Mínimo: regex de email básico y minLength para password.

  7. crearPedido hardcodea "admin" para la query interna (pedidos.service.js:130)
  return obtenerPedido(lastID, usuarioId, "admin");
  Usa el bypass de admin para saltear el check de propiedad. Funciona pero es frágil: si obtenerPedido cambia su lógica de autorización, esto se rompe silenciosamente. Solución: query directa o un helper interno obtenerPedidoById(id) sin autorización.

  8. Sin helmet
  No hay headers de seguridad HTTP (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, HSTS). helmet() en app.js es una línea.

  9. CORS wildcard (app.js:10)
  cors() sin config acepta cualquier origen. En producción necesita origin: process.env.CORS_ORIGIN.

  10. Sin límite de payload
  express.json() sin { limit: "10kb" } acepta bodies de cualquier tamaño. Un body de 50MB bloquea el event loop mientras se parsea.

  ---
  🟡 Medio — Buenas prácticas y arquitectura

  11. No hay ruta 404 genérica en app.js
  Rutas inexistentes como GET /api/foo devuelven HTML (el default de Express). La API debería ser 100% JSON:
  app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada" }));
  Debe ir antes del errorHandler.

  12. try/catch repetido en 9 controllers
  Cada función de controller es idéntica estructuralmente. Un wrapper asyncHandler eliminaría el boilerplate:
  const asyncHandler = fn => (req, res, next) => fn(req, res, next).catch(next);

  13. Sin cap en el parámetro limit de paginación
  GET /api/pedidos?limit=9999999 no está restringido. Solución: const limit = Math.min(Number(req.query.limit) || 10, 100).

  14. fecha no validada como formato de fecha
  fecha: { type: "string" } acepta "notadate". El pedido se inserta con fecha inválida. Agregar validación de formato YYYY-MM-DD en el validator.

  15. Sin índices en la base de datos (initDb.js)
  Columnas que se filtran frecuentemente sin índice: pedidos.estado, pedidos.usuarioId, pedidos.fecha, pedidos.menuId. Para el TP no importa, pero es una deuda técnica real.

  16. SQLite sin WAL mode
  Sin WAL (PRAGMA journal_mode = WAL), SQLite bloquea toda la DB en cada write. Con WAL, los reads no bloquean los writes. Una línea en db.js.

  17. Sin logging de requests
  No hay morgan ni equivalente. En producción es imposible debuggear sin saber qué requests llegaron, con qué respuesta y en cuánto tiempo.

  18. validate.js sin soporte de maxLength
  No hay límite de longitud en strings. Un nombre de 100.000 caracteres se inserta sin problema.

  19. Tests frágiles por IDs hardcodeados
  Tests 4, 11 y 12 dependen de pedidoId 1 y pedidoId 2 del seed. Si el seed cambia o la DB tiene datos previos, los tests fallan. Solución: crear los pedidos de test en beforeAll y usar esos IDs.

  20. errorHandler sin logging contextual
  Solo hace console.error(err). No loguea el método HTTP, la URL ni el usuarioId del request, que es la información que necesitás para debuggear en producción.

  ---
  🟢 Bajo — Pulido y consistencia

  21. order param en listarPedidos falla silenciosamente
  Si se pasa ?order=invalido, cae al default "fecha" sin avisar al cliente. Podría devolver 400 o al menos documentarlo.

  22. Respuestas inconsistentes en PATCH
  cancelar, confirmar y entregar devuelven el pedido completo. Esto está bien, pero no está documentado en el README como behavior explícito.

  23. seedDb no usa transacciones
  Si el seed falla a mitad, la DB queda con datos parciales. Envolver todo en una transacción evita eso.

  24. bcrypt salt factor no configurado en env
  bcrypt.hash(password, 10) hardcodea el factor 10. Debería ser Number(process.env.BCRYPT_ROUNDS) || 10.