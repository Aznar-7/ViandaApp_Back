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

export const crearMenu = asyncHandler(async (req, res) => {
    const menu = await menusService.crearMenu(req.body);
    res.status(201).json(menu);
});

export const obtenerMenu = asyncHandler(async (req, res) => {
    res.json(await menusService.obtenerMenu(req.validatedId));
});

export const editarMenu = asyncHandler(async (req, res) => {
    res.json(await menusService.editarMenu(req.validatedId, req.body));
});

export const activarMenu = asyncHandler(async (req, res) => {
    res.json(await menusService.cambiarActivo(req.validatedId, 1));
});

export const desactivarMenu = asyncHandler(async (req, res) => {
    res.json(await menusService.cambiarActivo(req.validatedId, 0));
});
