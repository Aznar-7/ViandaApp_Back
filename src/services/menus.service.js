import { getDb } from "../database/db.js";

export async function listarMenus({ tipo, fecha, activo = 1 } = {}) {
    const db = await getDb();

    const condiciones = ["m.activo = ?"];
    const params = [activo];

    if (tipo) {
        condiciones.push("m.tipo = ?");
        params.push(tipo);
    }

    if (fecha) {
        condiciones.push("m.fecha = ?");
        params.push(fecha);
    }

    return db.all(`
        SELECT
            m.*,
            m.cupoDiario - COALESCE(SUM(
                CASE WHEN p.estado IN ('pendiente', 'confirmado', 'entregado') THEN p.cantidad ELSE 0 END
            ), 0) AS cupoDisponible
        FROM menus m
        LEFT JOIN pedidos p ON p.menuId = m.id AND p.fecha = m.fecha
        WHERE ${condiciones.join(" AND ")}
        GROUP BY m.id
    `, params);
}
