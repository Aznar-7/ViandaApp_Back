import * as sedesService from "../services/sedes.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listarSedes = asyncHandler(async (req, res) => {
    const activo = req.query.activo === undefined ? 1 : Number(req.query.activo);
    if (![0, 1].includes(activo)) {
        return res.status(400).json({ error: "\"activo\" debe ser 0 o 1" });
    }

    res.json(await sedesService.listarSedes({ activo }));
});

export const obtenerSede = asyncHandler(async (req, res) => {
    res.json(await sedesService.obtenerSede(req.validatedId));
});

export const crearSede = asyncHandler(async (req, res) => {
    res.status(201).json(await sedesService.crearSede(req.body));
});

export const editarSede = asyncHandler(async (req, res) => {
    res.json(await sedesService.editarSede(req.validatedId, req.body));
});

export const activarSede = asyncHandler(async (req, res) => {
    res.json(await sedesService.cambiarActivo(req.validatedId, 1));
});

export const desactivarSede = asyncHandler(async (req, res) => {
    res.json(await sedesService.cambiarActivo(req.validatedId, 0));
});
