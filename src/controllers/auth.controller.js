import * as authService from "../services/auth.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const register = asyncHandler(async (req, res) => {
    const { nombre, email, password } = req.body;
    const usuario = await authService.register(nombre, email, password);
    res.status(201).json(usuario);
});

export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(200).json(result);
});
