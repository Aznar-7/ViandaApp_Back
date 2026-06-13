import { getDb } from "../database/db.js";
import { AppError } from "../utils/AppErrors.js";

export async function listarSedes({ activo = 1 } = {}) {
    const db = await getDb();
    return db.all(
        "SELECT id, nombre, direccion, activo FROM sedes WHERE activo = ? ORDER BY nombre ASC",
        [activo]
    );
}

export async function obtenerSede(id) {
    const db = await getDb();
    const sede = await db.get(
        "SELECT id, nombre, direccion, activo FROM sedes WHERE id = ?",
        [id]
    );
    if (!sede) throw AppError("Sede no encontrada", 404);
    return sede;
}

export async function crearSede({ nombre, direccion, activo }) {
    const db = await getDb();
    const normalizedName = nombre.trim();
    const normalizedAddress = direccion.trim();
    if (normalizedName.length < 2 || normalizedAddress.length < 2) {
        throw AppError("Nombre y direccion deben tener al menos 2 caracteres", 400);
    }

    const existente = await db.get("SELECT id FROM sedes WHERE LOWER(nombre) = LOWER(?)", [normalizedName]);
    if (existente) throw AppError("Ya existe una sede con ese nombre", 409);

    try {
        const { lastID } = await db.run(
            "INSERT INTO sedes (nombre, direccion, activo) VALUES (?, ?, ?)",
            [normalizedName, normalizedAddress, activo]
        );
        return obtenerSede(lastID);
    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT") throw AppError("Ya existe una sede con ese nombre", 409);
        throw error;
    }
}

export async function editarSede(id, { nombre, direccion, activo }) {
    if ([nombre, direccion, activo].every(value => value === undefined)) {
        throw AppError("Debes enviar al menos un campo para editar", 400);
    }

    const db = await getDb();
    const sede = await db.get("SELECT * FROM sedes WHERE id = ?", [id]);
    if (!sede) throw AppError("Sede no encontrada", 404);
    const normalizedName = nombre?.trim() ?? sede.nombre;
    const normalizedAddress = direccion?.trim() ?? sede.direccion;
    if (normalizedName.length < 2 || normalizedAddress.length < 2) {
        throw AppError("Nombre y direccion deben tener al menos 2 caracteres", 400);
    }

    const existente = await db.get(
        "SELECT id FROM sedes WHERE LOWER(nombre) = LOWER(?) AND id != ?",
        [normalizedName, id]
    );
    if (existente) throw AppError("Ya existe una sede con ese nombre", 409);

    try {
        await db.run(
            "UPDATE sedes SET nombre = ?, direccion = ?, activo = ? WHERE id = ?",
            [
                normalizedName,
                normalizedAddress,
                activo ?? sede.activo,
                id,
            ]
        );
        return obtenerSede(id);
    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT") throw AppError("Ya existe una sede con ese nombre", 409);
        throw error;
    }
}

export async function cambiarActivo(id, activo) {
    return editarSede(id, { activo });
}
