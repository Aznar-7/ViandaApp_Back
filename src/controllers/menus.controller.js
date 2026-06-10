import * as menusService from "../services/menus.service.js";

export async function listarMenus(req, res, next) {
    try {
        const { tipo, fecha } = req.query;
        const activo = req.query.activo !== undefined ? Number(req.query.activo) : 1;

        const menus = await menusService.listarMenus({ tipo, fecha, activo });
        res.json(menus);
    } catch (error) {
        next(error);
    }
}
