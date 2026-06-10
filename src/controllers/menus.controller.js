import * as menusService from "../services/menus.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listarMenus = asyncHandler(async (req, res) => {
    const { tipo, fecha } = req.query;
    const activo = req.query.activo !== undefined ? Number(req.query.activo) : 1;
    const menus = await menusService.listarMenus({ tipo, fecha, activo });
    res.json(menus);
});
