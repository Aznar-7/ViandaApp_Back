import { ROLES } from "../domain/constants.js";
import * as usuariosService from "../services/usuarios.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listarUsuarios = asyncHandler(async (req, res) => {
    const { rol } = req.query;
    const activo = req.query.activo === undefined ? undefined : Number(req.query.activo);

    if (rol && !ROLES.includes(rol)) {
        return res.status(400).json({ error: `"rol" debe ser: ${ROLES.join(", ")}` });
    }
    if (activo !== undefined && ![0, 1].includes(activo)) {
        return res.status(400).json({ error: "\"activo\" debe ser 0 o 1" });
    }

    res.json(await usuariosService.listarUsuarios({ rol, activo }));
});

export const obtenerUsuario = asyncHandler(async (req, res) => {
    res.json(await usuariosService.obtenerUsuario(req.validatedId));
});

export const crearUsuario = asyncHandler(async (req, res) => {
    res.status(201).json(await usuariosService.crearUsuario(req.body));
});

export const editarUsuario = asyncHandler(async (req, res) => {
    res.json(await usuariosService.editarUsuario(req.validatedId, req.user.id, req.body));
});

export const activarUsuario = asyncHandler(async (req, res) => {
    res.json(await usuariosService.cambiarActivo(req.validatedId, req.user.id, 1));
});

export const desactivarUsuario = asyncHandler(async (req, res) => {
    res.json(await usuariosService.cambiarActivo(req.validatedId, req.user.id, 0));
});
