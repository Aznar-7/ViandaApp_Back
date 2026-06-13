import { getDb } from "../database/db.js";

export async function listarSedes({ activo = 1 } = {}) {
    const db = await getDb();
    return db.all(
        "SELECT id, nombre, direccion, activo FROM sedes WHERE activo = ? ORDER BY nombre ASC",
        [activo]
    );
}
