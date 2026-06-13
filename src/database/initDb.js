import { getDb } from "./db.js";
import path from "path";
import { fileURLToPath } from "url";

export async function initDb() {
    const db = await getDb();

    await db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      rol TEXT NOT NULL CHECK (rol IN ('usuario', 'admin')),
      activo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      fecha TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('clasico', 'vegetariano', 'vegano', 'sin_tacc')),
      precio REAL NOT NULL,
      cupoDiario INTEGER NOT NULL,
      activo INTEGER NOT NULL DEFAULT 1,
      imagenUrl TEXT
    );

    CREATE TABLE IF NOT EXISTS sedes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      direccion TEXT NOT NULL,
      activo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menuId INTEGER NOT NULL,
      usuarioId INTEGER NOT NULL,
      fecha TEXT NOT NULL,
      cantidad INTEGER NOT NULL,
      turnoEntrega TEXT NOT NULL CHECK (turnoEntrega IN ('almuerzo', 'cena')),
      puntoRetiroId INTEGER NOT NULL,
      total REAL NOT NULL,
      estado TEXT NOT NULL CHECK (estado IN ('pendiente', 'confirmado', 'cancelado', 'entregado')),
      observaciones TEXT,
      FOREIGN KEY (menuId) REFERENCES menus(id),
      FOREIGN KEY (usuarioId) REFERENCES usuarios(id),
      FOREIGN KEY (puntoRetiroId) REFERENCES sedes(id)
    );

    CREATE TABLE IF NOT EXISTS historial_pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedidoId INTEGER NOT NULL,
      usuarioId INTEGER NOT NULL,
      accion TEXT NOT NULL,
      fechaHora TEXT NOT NULL,
      valorAnterior TEXT,
      valorNuevo TEXT,
      FOREIGN KEY (pedidoId) REFERENCES pedidos(id),
      FOREIGN KEY (usuarioId) REFERENCES usuarios(id)
    );
  `);

    await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pedidos_usuarioId ON pedidos(usuarioId);
    CREATE INDEX IF NOT EXISTS idx_pedidos_estado    ON pedidos(estado);
    CREATE INDEX IF NOT EXISTS idx_pedidos_fecha     ON pedidos(fecha);
    CREATE INDEX IF NOT EXISTS idx_pedidos_menuId    ON pedidos(menuId);
    CREATE INDEX IF NOT EXISTS idx_pedidos_menu_fecha_estado ON pedidos(menuId, fecha, estado);
    CREATE INDEX IF NOT EXISTS idx_pedidos_usuario_fecha ON pedidos(usuarioId, fecha DESC);
    CREATE INDEX IF NOT EXISTS idx_pedidos_puntoRetiroId ON pedidos(puntoRetiroId);
    CREATE INDEX IF NOT EXISTS idx_historial_pedido_fecha ON historial_pedidos(pedidoId, fechaHora);
  `);

    console.log("Base de datos inicializada correctamente.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    initDb().catch((error) => {
        console.error("Error inicializando la base:", error);
        process.exitCode = 1;
    });
}
