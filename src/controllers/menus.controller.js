import * as menusService from "../services/menus.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { TIPOS_MENU } from "../domain/constants.js";
import { isValidDateString } from "../utils/date.js";

export const listarMenus = asyncHandler(async (req, res) => {
    const { tipo, fecha } = req.query;
    const activo = req.query.activo !== undefined ? Number(req.query.activo) : 1;
    if (tipo && !TIPOS_MENU.includes(tipo)) {
        return res.status(400).json({ error: `"tipo" debe ser: ${TIPOS_MENU.join(", ")}` });
    }
    if (fecha && !isValidDateString(fecha)) {
        return res.status(400).json({ error: "\"fecha\" debe ser una fecha valida con formato YYYY-MM-DD" });
    }
    if (![0, 1].includes(activo)) {
        return res.status(400).json({ error: "\"activo\" debe ser 0 o 1" });
    }
    const menus = await menusService.listarMenus({ tipo, fecha, activo });
    res.json(menus);
});
