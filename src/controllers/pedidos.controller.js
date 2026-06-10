import * as pedidosService from "../services/pedidos.service.js";

export async function listarPedidos(req, res, next) {
    try {
        const { estado, fecha, order } = req.query;
        const page  = Number(req.query.page)  || 1;
        const limit = Number(req.query.limit) || 10;

        const result = await pedidosService.listarPedidos({
            usuarioId: req.user.id,
            rol:       req.user.rol,
            estado, fecha, page, limit, order,
        });
        res.json(result);
    } catch (error) {
        next(error);
    }
}

export async function obtenerPedido(req, res, next) {
    try {
        const pedido = await pedidosService.obtenerPedido(
            Number(req.params.id), req.user.id, req.user.rol
        );
        res.json(pedido);
    } catch (error) {
        next(error);
    }
}

export async function crearPedido(req, res, next) {
    try {
        const { menuId, fecha, cantidad, turnoEntrega, puntoRetiro, observaciones } = req.body;
        const pedido = await pedidosService.crearPedido({
            menuId, usuarioId: req.user.id, fecha, cantidad, turnoEntrega, puntoRetiro, observaciones,
        });
        res.status(201).json(pedido);
    } catch (error) {
        next(error);
    }
}

export async function editarPedido(req, res, next) {
    try {
        const pedido = await pedidosService.editarPedido(
            Number(req.params.id), req.user.id, req.user.rol, req.body
        );
        res.json(pedido);
    } catch (error) {
        next(error);
    }
}

export async function cancelarPedido(req, res, next) {
    try {
        const pedido = await pedidosService.cambiarEstado(
            Number(req.params.id), "cancelado", req.user.id, req.user.rol
        );
        res.json(pedido);
    } catch (error) {
        next(error);
    }
}

export async function confirmarPedido(req, res, next) {
    try {
        const pedido = await pedidosService.cambiarEstado(
            Number(req.params.id), "confirmado", req.user.id, req.user.rol
        );
        res.json(pedido);
    } catch (error) {
        next(error);
    }
}

export async function entregarPedido(req, res, next) {
    try {
        const pedido = await pedidosService.cambiarEstado(
            Number(req.params.id), "entregado", req.user.id, req.user.rol
        );
        res.json(pedido);
    } catch (error) {
        next(error);
    }
}

export async function obtenerResumen(req, res, next) {
    try {
        const resumen = await pedidosService.obtenerResumen();
        res.json(resumen);
    } catch (error) {
        next(error);
    }
}

export async function obtenerHistorial(req, res, next) {
    try {
        const historial = await pedidosService.obtenerHistorial(
            Number(req.params.id), req.user.id, req.user.rol
        );
        res.json(historial);
    } catch (error) {
        next(error);
    }
}
