import * as sedesService from "../services/sedes.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listarSedes = asyncHandler(async (req, res) => {
    const activo = req.query.activo === undefined ? 1 : Number(req.query.activo);
    if (![0, 1].includes(activo)) {
        return res.status(400).json({ error: "\"activo\" debe ser 0 o 1" });
    }

    res.json(await sedesService.listarSedes({ activo }));
});
