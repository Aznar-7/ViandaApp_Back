import { getDb } from "../database/db.js";
import { AppError } from "../utils/AppErrors.js";

async function fetchMenuById(db, id) {
    const menu = await db.get(
        `SELECT
            m.*,
            m.cupoDiario - COALESCE(SUM(
                CASE WHEN p.estado IN ('pendiente', 'confirmado', 'entregado') THEN p.cantidad ELSE 0 END
            ), 0) AS cupoDisponible
         FROM menus m
         LEFT JOIN pedidos p ON p.menuId = m.id AND p.fecha = m.fecha
         WHERE m.id = ?
         GROUP BY m.id`,
        [id]
    );
    if (!menu) throw AppError("Menu no encontrado", 404);
    return menu;
}

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

export async function crearMenu({
    nombre,
    descripcion,
    fecha,
    tipo,
    precio,
    cupoDiario,
    activo,
    imagenUrl,
}) {
    const db = await getDb();
    const { lastID } = await db.run(
        `INSERT INTO menus (
            nombre, descripcion, fecha, tipo, precio, cupoDiario, activo, imagenUrl
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [nombre, descripcion, fecha, tipo, precio, cupoDiario, activo, imagenUrl ?? null]
    );

    return fetchMenuById(db, lastID);
}

export async function obtenerMenu(id) {
    const db = await getDb();
    return fetchMenuById(db, id);
}

export async function editarMenu(id, cambios) {
    const campos = ["nombre", "descripcion", "fecha", "tipo", "precio", "cupoDiario", "activo", "imagenUrl"];
    if (campos.every(campo => cambios[campo] === undefined)) {
        throw AppError("Debes enviar al menos un campo para editar", 400);
    }

    const db = await getDb();
    const menu = await db.get("SELECT * FROM menus WHERE id = ?", [id]);
    if (!menu) throw AppError("Menu no encontrado", 404);

    const nombre = cambios.nombre?.trim() ?? menu.nombre;
    const descripcion = cambios.descripcion?.trim() ?? menu.descripcion;
    if (nombre.length < 2 || descripcion.length < 2) {
        throw AppError("Nombre y descripcion deben tener al menos 2 caracteres", 400);
    }

    const fecha = cambios.fecha ?? menu.fecha;
    if (fecha !== menu.fecha) {
        const { total } = await db.get("SELECT COUNT(*) AS total FROM pedidos WHERE menuId = ?", [id]);
        if (total > 0) {
            throw AppError("No se puede cambiar la fecha de un menu que ya tiene pedidos", 400);
        }
    }

    const cupoDiario = cambios.cupoDiario ?? menu.cupoDiario;
    const { reservado } = await db.get(
        `SELECT COALESCE(SUM(cantidad), 0) AS reservado
         FROM pedidos
         WHERE menuId = ? AND fecha = ? AND estado IN ('pendiente', 'confirmado', 'entregado')`,
        [id, fecha]
    );
    if (cupoDiario < reservado) {
        throw AppError(`El cupoDiario no puede ser menor al cupo ya reservado: ${reservado}`, 400);
    }

    await db.run(
        `UPDATE menus
         SET nombre = ?, descripcion = ?, fecha = ?, tipo = ?, precio = ?,
             cupoDiario = ?, activo = ?, imagenUrl = ?
         WHERE id = ?`,
        [
            nombre,
            descripcion,
            fecha,
            cambios.tipo ?? menu.tipo,
            cambios.precio ?? menu.precio,
            cupoDiario,
            cambios.activo ?? menu.activo,
            cambios.imagenUrl ?? menu.imagenUrl,
            id,
        ]
    );

    return fetchMenuById(db, id);
}

export async function cambiarActivo(id, activo) {
    return editarMenu(id, { activo });
}
