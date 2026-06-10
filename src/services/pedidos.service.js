import { getDb, withTransaction } from "../database/db.js";
import { ORDENES_PEDIDO } from "../domain/constants.js";
import { AppError } from "../utils/AppErrors.js";
import { getBusinessDate } from "../utils/date.js";

async function fetchPedidoById(db, id) {
    const pedido = await db.get(
        `SELECT p.*, m.nombre AS menuNombre, u.nombre AS usuarioNombre
         FROM pedidos p
         JOIN menus m ON m.id = p.menuId
         JOIN usuarios u ON u.id = p.usuarioId
         WHERE p.id = ?`,
        [id]
    );
    if (!pedido) throw AppError("Pedido no encontrado", 404);
    return pedido;
}

async function registrarHistorial(db, { pedidoId, usuarioId, accion, valorAnterior = null, valorNuevo = null }) {
    await db.run(
        `INSERT INTO historial_pedidos (pedidoId, usuarioId, accion, fechaHora, valorAnterior, valorNuevo)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            pedidoId,
            usuarioId,
            accion,
            new Date().toISOString(),
            valorAnterior ? JSON.stringify(valorAnterior) : null,
            valorNuevo ? JSON.stringify(valorNuevo) : null,
        ]
    );
}

async function calcularCupoDisponible(db, menuId, fecha, excluirPedidoId = -1) {
    const row = await db.get(
        `SELECT m.cupoDiario - COALESCE(SUM(
             CASE WHEN p.estado IN ('pendiente', 'confirmado', 'entregado') THEN p.cantidad ELSE 0 END
         ), 0) AS cupoDisponible
         FROM menus m
         LEFT JOIN pedidos p ON p.menuId = m.id AND p.fecha = ? AND p.id != ?
         WHERE m.id = ?
         GROUP BY m.id`,
        [fecha, excluirPedidoId, menuId]
    );
    return row?.cupoDisponible ?? 0;
}

export async function listarPedidos({ usuarioId, rol, estado, fecha, page = 1, limit = 10, order = "fecha" }) {
    const db = await getDb();
    const condiciones = [];
    const params = [];

    if (rol === "usuario") {
        condiciones.push("p.usuarioId = ?");
        params.push(usuarioId);
    }
    if (estado) {
        condiciones.push("p.estado = ?");
        params.push(estado);
    }
    if (fecha) {
        condiciones.push("p.fecha = ?");
        params.push(fecha);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
    const col = ORDENES_PEDIDO.includes(order) ? order : "fecha";
    const offset = (page - 1) * limit;

    const [pedidos, conteo] = await Promise.all([
        db.all(
            `SELECT p.*, m.nombre AS menuNombre, u.nombre AS usuarioNombre
             FROM pedidos p
             JOIN menus m ON m.id = p.menuId
             JOIN usuarios u ON u.id = p.usuarioId
             ${where}
             ORDER BY p.${col} DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        ),
        db.get(`SELECT COUNT(*) AS total FROM pedidos p ${where}`, params),
    ]);

    return { pedidos, total: conteo.total, page, limit };
}

export async function obtenerPedido(id, usuarioId, rol) {
    const db = await getDb();
    const pedido = await fetchPedidoById(db, id);
    if (rol === "usuario" && pedido.usuarioId !== usuarioId) {
        throw AppError("No tenes acceso a este pedido", 403);
    }
    return pedido;
}

export async function crearPedido({ menuId, usuarioId, fecha, cantidad, turnoEntrega, puntoRetiro, observaciones }) {
    return withTransaction(async (txDb) => {
        const menu = await txDb.get("SELECT * FROM menus WHERE id = ?", [menuId]);
        if (!menu) throw AppError("Menu no encontrado", 404);
        if (!menu.activo) throw AppError("El menu no esta activo", 400);
        if (menu.fecha !== fecha) throw AppError("El menu no esta disponible para esa fecha", 400);

        const cupoDisponible = await calcularCupoDisponible(txDb, menuId, fecha);
        if (cantidad > cupoDisponible) {
            throw AppError(`Cupo insuficiente. Disponible: ${cupoDisponible}`, 400);
        }

        const total = menu.precio * cantidad;
        const { lastID } = await txDb.run(
            `INSERT INTO pedidos (menuId, usuarioId, fecha, cantidad, turnoEntrega, puntoRetiro, total, estado, observaciones)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)`,
            [menuId, usuarioId, fecha, cantidad, turnoEntrega, puntoRetiro, total, observaciones ?? null]
        );

        await registrarHistorial(txDb, {
            pedidoId: lastID,
            usuarioId,
            accion: "creacion",
            valorNuevo: { estado: "pendiente", cantidad, total },
        });

        return fetchPedidoById(txDb, lastID);
    });
}

export async function editarPedido(id, usuarioId, rol, { cantidad, turnoEntrega, puntoRetiro, observaciones }) {
    if ([cantidad, turnoEntrega, puntoRetiro, observaciones].every(value => value === undefined)) {
        throw AppError("Debes enviar al menos un campo para editar", 400);
    }

    return withTransaction(async (txDb) => {
        const pedido = await txDb.get("SELECT * FROM pedidos WHERE id = ?", [id]);
        if (!pedido) throw AppError("Pedido no encontrado", 404);
        if (rol === "usuario" && pedido.usuarioId !== usuarioId) {
            throw AppError("No tenes acceso a este pedido", 403);
        }
        if (!["pendiente", "confirmado"].includes(pedido.estado)) {
            throw AppError("Solo se pueden editar pedidos pendientes o confirmados", 400);
        }

        const nuevaCantidad = cantidad ?? pedido.cantidad;
        if (cantidad !== undefined && cantidad !== pedido.cantidad) {
            const cupoDisponible = await calcularCupoDisponible(txDb, pedido.menuId, pedido.fecha, id);
            if (nuevaCantidad > cupoDisponible) {
                throw AppError(`Cupo insuficiente. Disponible: ${cupoDisponible}`, 400);
            }
        }

        const menu = await txDb.get("SELECT precio FROM menus WHERE id = ?", [pedido.menuId]);
        const nuevoTotal = menu.precio * nuevaCantidad;
        const valorAnterior = {
            cantidad: pedido.cantidad,
            turnoEntrega: pedido.turnoEntrega,
            puntoRetiro: pedido.puntoRetiro,
            total: pedido.total,
            observaciones: pedido.observaciones,
        };

        const result = await txDb.run(
            `UPDATE pedidos
             SET cantidad = ?, turnoEntrega = ?, puntoRetiro = ?, total = ?, observaciones = ?
             WHERE id = ? AND estado = ?`,
            [
                nuevaCantidad,
                turnoEntrega ?? pedido.turnoEntrega,
                puntoRetiro ?? pedido.puntoRetiro,
                nuevoTotal,
                observaciones ?? pedido.observaciones,
                id,
                pedido.estado,
            ]
        );
        if (result.changes !== 1) {
            throw AppError("El pedido cambio mientras se procesaba la solicitud", 409);
        }

        await registrarHistorial(txDb, {
            pedidoId: id,
            usuarioId,
            accion: "edicion",
            valorAnterior,
            valorNuevo: {
                cantidad: nuevaCantidad,
                turnoEntrega: turnoEntrega ?? pedido.turnoEntrega,
                puntoRetiro: puntoRetiro ?? pedido.puntoRetiro,
                total: nuevoTotal,
                observaciones: observaciones ?? pedido.observaciones,
            },
        });

        return fetchPedidoById(txDb, id);
    });
}

const TRANSICIONES = {
    pendiente: { confirmado: ["admin"], cancelado: ["admin", "usuario"] },
    confirmado: { cancelado: ["admin", "usuario"], entregado: ["admin"] },
};

export async function cambiarEstado(id, nuevoEstado, usuarioId, rol) {
    return withTransaction(async (txDb) => {
        const pedido = await txDb.get("SELECT * FROM pedidos WHERE id = ?", [id]);
        if (!pedido) throw AppError("Pedido no encontrado", 404);

        const rolesPermitidos = TRANSICIONES[pedido.estado]?.[nuevoEstado];
        if (!rolesPermitidos) {
            throw AppError(`No se puede pasar de "${pedido.estado}" a "${nuevoEstado}"`, 400);
        }
        if (!rolesPermitidos.includes(rol)) {
            throw AppError("No tenes permisos para esta transicion", 403);
        }
        if (rol === "usuario" && pedido.usuarioId !== usuarioId) {
            throw AppError("No tenes acceso a este pedido", 403);
        }

        const result = await txDb.run(
            "UPDATE pedidos SET estado = ? WHERE id = ? AND estado = ?",
            [nuevoEstado, id, pedido.estado]
        );
        if (result.changes !== 1) {
            throw AppError("El pedido cambio mientras se procesaba la solicitud", 409);
        }

        await registrarHistorial(txDb, {
            pedidoId: id,
            usuarioId,
            accion: `estado:${pedido.estado}->${nuevoEstado}`,
            valorAnterior: { estado: pedido.estado },
            valorNuevo: { estado: nuevoEstado },
        });

        return fetchPedidoById(txDb, id);
    });
}

export async function obtenerResumen() {
    const db = await getDb();
    const hoy = getBusinessDate();

    const [porEstado, recaudado, menuDelDia] = await Promise.all([
        db.all(
            `SELECT estado, COUNT(*) AS cantidad, SUM(total) AS totalMonto
             FROM pedidos GROUP BY estado`
        ),
        db.get(
            `SELECT COALESCE(SUM(total), 0) AS total
             FROM pedidos WHERE estado IN ('confirmado', 'entregado')`
        ),
        db.get(
            `SELECT m.nombre, SUM(p.cantidad) AS totalPedido
             FROM pedidos p
             JOIN menus m ON m.id = p.menuId
             WHERE p.fecha = ? AND p.estado != 'cancelado'
             GROUP BY p.menuId
             ORDER BY totalPedido DESC
             LIMIT 1`,
            [hoy]
        ),
    ]);

    return { porEstado, recaudado: recaudado.total, menuDelDia };
}

export async function obtenerHistorial(pedidoId, usuarioId, rol) {
    const db = await getDb();
    const pedido = await db.get("SELECT usuarioId FROM pedidos WHERE id = ?", [pedidoId]);
    if (!pedido) throw AppError("Pedido no encontrado", 404);
    if (rol === "usuario" && pedido.usuarioId !== usuarioId) {
        throw AppError("No tenes acceso a este pedido", 403);
    }

    const historial = await db.all(
        `SELECT h.*, u.nombre AS usuarioNombre
         FROM historial_pedidos h
         JOIN usuarios u ON u.id = h.usuarioId
         WHERE h.pedidoId = ?
         ORDER BY h.fechaHora ASC`,
        [pedidoId]
    );

    return historial.map(item => ({
        ...item,
        valorAnterior: item.valorAnterior ? JSON.parse(item.valorAnterior) : null,
        valorNuevo: item.valorNuevo ? JSON.parse(item.valorNuevo) : null,
    }));
}
