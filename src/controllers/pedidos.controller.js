import * as pedidosService from "../services/pedidos.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const VALID_ORDERS = ["fecha", "estado", "total"];
const VALID_ESTADOS = ["pendiente", "confirmado", "cancelado", "entregado"];

export const listarPedidos = asyncHandler(async (req, res) => {
    const { estado, fecha, order } = req.query;

    if (order && !VALID_ORDERS.includes(order)) {
        return res.status(400).json({ error: `"order" debe ser: ${VALID_ORDERS.join(", ")}` });
    }
    if (estado && !VALID_ESTADOS.includes(estado)) {
        return res.status(400).json({ error: `"estado" debe ser: ${VALID_ESTADOS.join(", ")}` });
    }

    const page  = Math.max(Number(req.query.page)  || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 10, 100);

    const result = await pedidosService.listarPedidos({
        usuarioId: req.user.id,
        rol:       req.user.rol,
        estado, fecha, page, limit, order,
    });
    res.json(result);
});

export const obtenerPedido = asyncHandler(async (req, res) => {
    const pedido = await pedidosService.obtenerPedido(
        Number(req.params.id), req.user.id, req.user.rol
    );
    res.json(pedido);
});

export const crearPedido = asyncHandler(async (req, res) => {
    const { menuId, fecha, cantidad, turnoEntrega, puntoRetiro, observaciones } = req.body;
    const pedido = await pedidosService.crearPedido({
        menuId, usuarioId: req.user.id, fecha, cantidad, turnoEntrega, puntoRetiro, observaciones,
    });
    res.status(201).json(pedido);
});

export const editarPedido = asyncHandler(async (req, res) => {
    const pedido = await pedidosService.editarPedido(
        Number(req.params.id), req.user.id, req.user.rol, req.body
    );
    res.json(pedido);
});

export const cancelarPedido = asyncHandler(async (req, res) => {
    const pedido = await pedidosService.cambiarEstado(
        Number(req.params.id), "cancelado", req.user.id, req.user.rol
    );
    res.json(pedido);
});

export const confirmarPedido = asyncHandler(async (req, res) => {
    const pedido = await pedidosService.cambiarEstado(
        Number(req.params.id), "confirmado", req.user.id, req.user.rol
    );
    res.json(pedido);
});

export const entregarPedido = asyncHandler(async (req, res) => {
    const pedido = await pedidosService.cambiarEstado(
        Number(req.params.id), "entregado", req.user.id, req.user.rol
    );
    res.json(pedido);
});

export const obtenerResumen = asyncHandler(async (req, res) => {
    const resumen = await pedidosService.obtenerResumen();
    res.json(resumen);
});

export const obtenerHistorial = asyncHandler(async (req, res) => {
    const historial = await pedidosService.obtenerHistorial(
        Number(req.params.id), req.user.id, req.user.rol
    );
    res.json(historial);
});
