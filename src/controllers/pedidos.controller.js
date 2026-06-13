import * as pedidosService from "../services/pedidos.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { DIRECCIONES_ORDEN, ESTADOS_PEDIDO, ORDENES_PEDIDO, TIPOS_MENU } from "../domain/constants.js";
import { isValidDateString } from "../utils/date.js";

export const listarPedidos = asyncHandler(async (req, res) => {
    const { estado, fecha, tipo } = req.query;
    const menuId = req.query.menuId === undefined ? undefined : Number(req.query.menuId);
    let { sortBy, order } = req.query;

    // Compatibilidad con el contrato anterior: ?order=fecha equivale a ?sortBy=fecha&order=desc.
    if (!sortBy && ORDENES_PEDIDO.includes(order)) {
        sortBy = order;
        order = "desc";
    }
    sortBy ??= "fecha";
    order ??= "desc";

    if (!ORDENES_PEDIDO.includes(sortBy)) {
        return res.status(400).json({ error: `"sortBy" debe ser: ${ORDENES_PEDIDO.join(", ")}` });
    }
    if (!DIRECCIONES_ORDEN.includes(order)) {
        return res.status(400).json({ error: `"order" debe ser: ${DIRECCIONES_ORDEN.join(", ")}` });
    }
    if (estado && !ESTADOS_PEDIDO.includes(estado)) {
        return res.status(400).json({ error: `"estado" debe ser: ${ESTADOS_PEDIDO.join(", ")}` });
    }
    if (tipo && !TIPOS_MENU.includes(tipo)) {
        return res.status(400).json({ error: `"tipo" debe ser: ${TIPOS_MENU.join(", ")}` });
    }
    if (menuId !== undefined && (!Number.isInteger(menuId) || menuId < 1)) {
        return res.status(400).json({ error: "\"menuId\" debe ser un numero entero positivo" });
    }
    if (fecha && !isValidDateString(fecha)) {
        return res.status(400).json({ error: "\"fecha\" debe ser una fecha valida con formato YYYY-MM-DD" });
    }

    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);
    if (!Number.isInteger(page) || page < 1) {
        return res.status(400).json({ error: "\"page\" debe ser un numero entero positivo" });
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({ error: "\"limit\" debe ser un entero entre 1 y 100" });
    }

    const result = await pedidosService.listarPedidos({
        usuarioId: req.user.id,
        rol:       req.user.rol,
        estado, fecha, menuId, tipo, page, limit, sortBy, order,
    });
    res.json(result);
});

export const obtenerPedido = asyncHandler(async (req, res) => {
    const pedido = await pedidosService.obtenerPedido(
        req.validatedId, req.user.id, req.user.rol
    );
    res.json(pedido);
});

export const crearPedido = asyncHandler(async (req, res) => {
    const { menuId, fecha, cantidad, turnoEntrega, puntoRetiroId, observaciones } = req.body;
    const pedido = await pedidosService.crearPedido({
        menuId, usuarioId: req.user.id, fecha, cantidad, turnoEntrega, puntoRetiroId, observaciones,
    });
    res.status(201).json(pedido);
});

export const editarPedido = asyncHandler(async (req, res) => {
    const pedido = await pedidosService.editarPedido(
        req.validatedId, req.user.id, req.user.rol, req.body
    );
    res.json(pedido);
});

export const cancelarPedido = asyncHandler(async (req, res) => {
    const pedido = await pedidosService.cambiarEstado(
        req.validatedId, "cancelado", req.user.id, req.user.rol
    );
    res.json(pedido);
});

export const confirmarPedido = asyncHandler(async (req, res) => {
    const pedido = await pedidosService.cambiarEstado(
        req.validatedId, "confirmado", req.user.id, req.user.rol
    );
    res.json(pedido);
});

export const entregarPedido = asyncHandler(async (req, res) => {
    const pedido = await pedidosService.cambiarEstado(
        req.validatedId, "entregado", req.user.id, req.user.rol
    );
    res.json(pedido);
});

export const obtenerResumen = asyncHandler(async (req, res) => {
    const resumen = await pedidosService.obtenerResumen();
    res.json(resumen);
});

export const obtenerHistorial = asyncHandler(async (req, res) => {
    const historial = await pedidosService.obtenerHistorial(
        req.validatedId, req.user.id, req.user.rol
    );
    res.json(historial);
});
