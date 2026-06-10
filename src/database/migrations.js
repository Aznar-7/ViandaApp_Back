export async function runMigrations(db) {
    const menusTable = await db.get(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'menus'"
    );
    if (!menusTable) return;

    const menuColumns = await db.all("PRAGMA table_info(menus)");
    const hasImagenUrl = menuColumns.some(column => column.name === "imagenUrl");

    if (!hasImagenUrl) {
        await db.run("ALTER TABLE menus ADD COLUMN imagenUrl TEXT");
    }

    await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_pedidos_menu_fecha_estado
        ON pedidos(menuId, fecha, estado);

        CREATE INDEX IF NOT EXISTS idx_pedidos_usuario_fecha
        ON pedidos(usuarioId, fecha DESC);

        CREATE INDEX IF NOT EXISTS idx_historial_pedido_fecha
        ON historial_pedidos(pedidoId, fechaHora);
    `);
}
