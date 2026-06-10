import { getDb, withTransaction } from "../database/db.js";
import { AppError } from "../utils/AppErrors.js";

// ── Helpers internos ─────────────────────────────────────────────────────────

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
            valorNuevo    ? JSON.stringify(valorNuevo)    : null,
        ]
    );
}

// excluirPedidoId = -1 significa "no excluir ninguno" (para creación)
// Para edición se pasa el ID del pedido actual para no contarlo dos veces
async function calcularCupoDisponible(db, menuId, fecha, excluirPedidoId = -1) {
    const row = await db.get(
        `SELECT m.cupoDiario - COALESCE(SUM(
             CASE WHEN p.estado IN ('pendiente', 'confirmado') THEN p.cantidad ELSE 0 END
         ), 0) AS cupoDisponible
         FROM menus m
         LEFT JOIN pedidos p ON p.menuId = m.id AND p.fecha = ? AND p.id != ?
         WHERE m.id = ?
         GROUP BY m.id`,
        [fecha, excluirPedidoId, menuId]
    );
    return row?.cupoDisponible ?? 0;
}

// ── Listado ───────────────────────────────────────────────────────────────────

export async function listarPedidos({ usuarioId, rol, estado, fecha, page = 1, limit = 10, order = "fecha" }) {
    const db = await getDb();

    const condiciones = [];
    const params = [];

    // usuario solo ve los suyos; admin ve todos
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

    const where  = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
    const col    = ["fecha", "estado", "total"].includes(order) ? order : "fecha";
    const offset = (Number(page) - 1) * Number(limit);

    const [pedidos, conteo] = await Promise.all([
        db.all(
            `SELECT p.*, m.nombre AS menuNombre, u.nombre AS usuarioNombre
             FROM pedidos p
             JOIN menus m ON m.id = p.menuId
             JOIN usuarios u ON u.id = p.usuarioId
             ${where}
             ORDER BY p.${col} DESC
             LIMIT ? OFFSET ?`,
            [...params, Number(limit), offset]
        ),
        db.get(`SELECT COUNT(*) AS total FROM pedidos p ${where}`, params),
    ]);

    return { pedidos, total: conteo.total, page: Number(page), limit: Number(limit) };
}

// ── Detalle ───────────────────────────────────────────────────────────────────

export async function obtenerPedido(id, usuarioId, rol) {
    const db = await getDb();
    const pedido = await fetchPedidoById(db, id);
    if (rol === "usuario" && pedido.usuarioId !== usuarioId) throw AppError("No tenés acceso a este pedido", 403);
    return pedido;
}

// ── Crear ─────────────────────────────────────────────────────────────────────

export async function crearPedido({ menuId, usuarioId, fecha, cantidad, turnoEntrega, puntoRetiro, observaciones }) {
    if (cantidad <= 0) throw AppError("La cantidad debe ser mayor a 0", 400);

    // Validaciones de menú fuera de la transacción (solo lectura)
    const db = await getDb();
    const menu = await db.get("SELECT * FROM menus WHERE id = ?", [menuId]);
    if (!menu)        throw AppError("Menú no encontrado", 404);
    if (!menu.activo) throw AppError("El menú no está activo", 400);
    if (menu.fecha !== fecha) throw AppError("El menú no está disponible para esa fecha", 400);

    return withTransaction(async (txDb) => {
        // Cupo dentro de la transacción: BEGIN IMMEDIATE bloquea otros writers
        const cupoDisponible = await calcularCupoDisponible(txDb, menuId, fecha);
        if (cantidad > cupoDisponible) throw AppError(`Cupo insuficiente. Disponible: ${cupoDisponible}`, 400);

        const total = menu.precio * cantidad;

        const { lastID } = await txDb.run(
            `INSERT INTO pedidos (menuId, usuarioId, fecha, cantidad, turnoEntrega, puntoRetiro, total, estado, observaciones)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)`,
            [menuId, usuarioId, fecha, cantidad, turnoEntrega, puntoRetiro, total, observaciones ?? null]
        );

        await registrarHistorial(txDb, {
            pedidoId: lastID,
            usuarioId,
            accion:    "creacion",
            valorNuevo: { estado: "pendiente", cantidad, total },
        });

        return fetchPedidoById(txDb, lastID);
    });
}

// ── Editar ────────────────────────────────────────────────────────────────────

export async function editarPedido(id, usuarioId, rol, { cantidad, turnoEntrega, puntoRetiro, observaciones }) {
    if ([cantidad, turnoEntrega, puntoRetiro, observaciones].every(v => v === undefined)) {
        throw AppError("Debés enviar al menos un campo para editar", 400);
    }

    const db = await getDb();

    const pedido = await db.get("SELECT * FROM pedidos WHERE id = ?", [id]);
    if (!pedido) throw AppError("Pedido no encontrado", 404);
    if (rol === "usuario" && pedido.usuarioId !== usuarioId) throw AppError("No tenés acceso a este pedido", 403);
    if (!["pendiente", "confirmado"].includes(pedido.estado)) {
        throw AppError("Solo se pueden editar pedidos pendientes o confirmados", 400);
    }

    const nuevaCantidad = cantidad ?? pedido.cantidad;
    if (nuevaCantidad <= 0) throw AppError("La cantidad debe ser mayor a 0", 400);

    const menu = await db.get("SELECT precio FROM menus WHERE id = ?", [pedido.menuId]);

    return withTransaction(async (txDb) => {
        if (cantidad !== undefined && cantidad !== pedido.cantidad) {
            const cupoDisponible = await calcularCupoDisponible(txDb, pedido.menuId, pedido.fecha, id);
            if (nuevaCantidad > cupoDisponible) throw AppError(`Cupo insuficiente. Disponible: ${cupoDisponible}`, 400);
        }

        const nuevoTotal = menu.precio * nuevaCantidad;
        const valorAnterior = {
            cantidad:     pedido.cantidad,
            turnoEntrega: pedido.turnoEntrega,
            puntoRetiro:  pedido.puntoRetiro,
            total:        pedido.total,
        };

        await txDb.run(
            `UPDATE pedidos SET cantidad = ?, turnoEntrega = ?, puntoRetiro = ?, total = ?, observaciones = ? WHERE id = ?`,
            [
                nuevaCantidad,
                turnoEntrega  ?? pedido.turnoEntrega,
                puntoRetiro   ?? pedido.puntoRetiro,
                nuevoTotal,
                observaciones ?? pedido.observaciones,
                id,
            ]
        );

        await registrarHistorial(txDb, {
            pedidoId: id,
            usuarioId,
            accion: "edicion",
            valorAnterior,
            valorNuevo: {
                cantidad:     nuevaCantidad,
                turnoEntrega: turnoEntrega  ?? pedido.turnoEntrega,
                puntoRetiro:  puntoRetiro   ?? pedido.puntoRetiro,
                total:        nuevoTotal,
            },
        });

        return fetchPedidoById(txDb, id);
    });
}

// ── Cambio de estado ──────────────────────────────────────────────────────────

// Qué roles pueden ejecutar cada transición
const TRANSICIONES = {
    pendiente:  { confirmado: ["admin"], cancelado: ["admin", "usuario"] },
    confirmado: { cancelado:  ["admin", "usuario"], entregado: ["admin"] },
};

export async function cambiarEstado(id, nuevoEstado, usuarioId, rol) {
    const db = await getDb();

    const pedido = await db.get("SELECT * FROM pedidos WHERE id = ?", [id]);
    if (!pedido) throw AppError("Pedido no encontrado", 404);

    const transicionesDesde = TRANSICIONES[pedido.estado];
    if (!transicionesDesde?.[nuevoEstado]) {
        throw AppError(`No se puede pasar de "${pedido.estado}" a "${nuevoEstado}"`, 400);
    }
    if (!transicionesDesde[nuevoEstado].includes(rol)) {
        throw AppError("No tenés permisos para esta transición", 403);
    }
    if (rol === "usuario" && pedido.usuarioId !== usuarioId) {
        throw AppError("No tenés acceso a este pedido", 403);
    }

    const estadoAnterior = pedido.estado;

    return withTransaction(async (txDb) => {
        await txDb.run("UPDATE pedidos SET estado = ? WHERE id = ?", [nuevoEstado, id]);

        await registrarHistorial(txDb, {
            pedidoId: id,
            usuarioId,
            accion:        `estado:${estadoAnterior}->${nuevoEstado}`,
            valorAnterior: { estado: estadoAnterior },
            valorNuevo:    { estado: nuevoEstado },
        });

        return fetchPedidoById(txDb, id);
    });
}

// ── Resumen admin ─────────────────────────────────────────────────────────────

export async function obtenerResumen() {
    const db  = await getDb();
    const hoy = new Date().toISOString().split("T")[0];

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
             WHERE p.fecha = ?
             GROUP BY p.menuId
             ORDER BY totalPedido DESC
             LIMIT 1`,
            [hoy]
        ),
    ]);

    return { porEstado, recaudado: recaudado.total, menuDelDia };
}

// ── Historial ─────────────────────────────────────────────────────────────────

export async function obtenerHistorial(pedidoId, usuarioId, rol) {
    const db = await getDb();

    const pedido = await db.get("SELECT * FROM pedidos WHERE id = ?", [pedidoId]);
    if (!pedido) throw AppError("Pedido no encontrado", 404);
    if (rol === "usuario" && pedido.usuarioId !== usuarioId) throw AppError("No tenés acceso a este pedido", 403);

    const historial = await db.all(
        `SELECT h.*, u.nombre AS usuarioNombre
         FROM historial_pedidos h
         JOIN usuarios u ON u.id = h.usuarioId
         WHERE h.pedidoId = ?
         ORDER BY h.fechaHora ASC`,
        [pedidoId]
    );

    // Los valores se guardan como JSON strings — se parsean antes de devolver
    return historial.map(h => ({
        ...h,
        valorAnterior: h.valorAnterior ? JSON.parse(h.valorAnterior) : null,
        valorNuevo:    h.valorNuevo    ? JSON.parse(h.valorNuevo)    : null,
    }));
}
