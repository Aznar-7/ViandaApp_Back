import * as authService from "../services/auth.service.js";

export async function register(req, res, next) {
    try {
        const { nombre, email, password } = req.body;
        const usuario = await authService.register(nombre, email, password);
        res.status(201).json(usuario);
    } catch (error) {
        next(error);
    }
}

export async function login(req, res, next) {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}
