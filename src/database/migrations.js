export async function runMigrations(db) {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS sedes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL UNIQUE,
            direccion TEXT NOT NULL,
            activo INTEGER NOT NULL DEFAULT 1
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_sedes_nombre ON sedes(nombre);
    `);

    const menusTable = await db.get(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'menus'"
    );
    if (menusTable) {
        const menuColumns = await db.all("PRAGMA table_info(menus)");
        const hasImagenUrl = menuColumns.some(column => column.name === "imagenUrl");

        if (!hasImagenUrl) {
            await db.run("ALTER TABLE menus ADD COLUMN imagenUrl TEXT");
        }
    }

    const pedidosTable = await db.get(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'pedidos'"
    );
    if (!pedidosTable) return;

    const pedidoColumns = await db.all("PRAGMA table_info(pedidos)");
    const hasPuntoRetiro = pedidoColumns.some(column => column.name === "puntoRetiro");
    const hasPuntoRetiroId = pedidoColumns.some(column => column.name === "puntoRetiroId");

    if (hasPuntoRetiro && !hasPuntoRetiroId) {
        await db.run("ALTER TABLE pedidos ADD COLUMN puntoRetiroId INTEGER REFERENCES sedes(id)");

        const puntosRetiro = await db.all(
            "SELECT DISTINCT puntoRetiro AS nombre FROM pedidos WHERE puntoRetiro IS NOT NULL"
        );
        for (const { nombre } of puntosRetiro) {
            await db.run(
                `INSERT INTO sedes (nombre, direccion, activo)
                 VALUES (?, 'Direccion no registrada', 0)
                 ON CONFLICT(nombre) DO NOTHING`,
                [nombre]
            );
        }

        await db.run(`
            UPDATE pedidos
            SET puntoRetiroId = (
                SELECT s.id FROM sedes s WHERE s.nombre = pedidos.puntoRetiro
            )
            WHERE puntoRetiroId IS NULL
        `);
    }

    if (hasPuntoRetiro) {
        const { total } = await db.get(
            "SELECT COUNT(*) AS total FROM pedidos WHERE puntoRetiroId IS NULL"
        );
        if (total > 0) {
            throw new Error(`No se pudieron asociar ${total} pedidos legacy a una sede`);
        }

        await db.run("PRAGMA foreign_keys = OFF");
        await db.run("BEGIN");
        try {
            await db.exec(`
                CREATE TABLE pedidos_new (
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

                INSERT INTO pedidos_new (
                    id, menuId, usuarioId, fecha, cantidad, turnoEntrega,
                    puntoRetiroId, total, estado, observaciones
                )
                SELECT
                    id, menuId, usuarioId, fecha, cantidad, turnoEntrega,
                    puntoRetiroId, total, estado, observaciones
                FROM pedidos;

                DROP TABLE pedidos;
                ALTER TABLE pedidos_new RENAME TO pedidos;
            `);
            await db.run("COMMIT");
        } catch (error) {
            await db.run("ROLLBACK").catch(() => {});
            throw error;
        } finally {
            await db.run("PRAGMA foreign_keys = ON");
        }
    }

    await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_pedidos_usuarioId
        ON pedidos(usuarioId);

        CREATE INDEX IF NOT EXISTS idx_pedidos_estado
        ON pedidos(estado);

        CREATE INDEX IF NOT EXISTS idx_pedidos_fecha
        ON pedidos(fecha);

        CREATE INDEX IF NOT EXISTS idx_pedidos_menuId
        ON pedidos(menuId);

        CREATE INDEX IF NOT EXISTS idx_pedidos_menu_fecha_estado
        ON pedidos(menuId, fecha, estado);

        CREATE INDEX IF NOT EXISTS idx_pedidos_usuario_fecha
        ON pedidos(usuarioId, fecha DESC);

        CREATE INDEX IF NOT EXISTS idx_pedidos_puntoRetiroId
        ON pedidos(puntoRetiroId);

        CREATE INDEX IF NOT EXISTS idx_historial_pedido_fecha
        ON historial_pedidos(pedidoId, fechaHora);
    `);
}
