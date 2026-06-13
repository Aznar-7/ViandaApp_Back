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

    await db.exec(`
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
