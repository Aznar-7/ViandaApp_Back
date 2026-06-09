import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";
import { AppError } from "../utils/AppErrors.js";

export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(AppError("Token requerido", 401));
    }

    const token = authHeader.split(" ")[1];

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        next(AppError("Token inválido o expirado", 401));
    }
}
