import jwt from "jsonwebtoken";
import { JWT_AUDIENCE, JWT_ISSUER, JWT_SECRET } from "../config/env.js";
import { getDb } from "../database/db.js";
import { AppError } from "../utils/AppErrors.js";

export async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(AppError("Token requerido", 401));
    }

    const token = authHeader.split(" ")[1];

    let payload;
    try {
        payload = jwt.verify(token, JWT_SECRET, {
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
        });
    } catch {
        return next(AppError("Token invalido o expirado", 401));
    }

    try {
        const db = await getDb();
        const user = await db.get(
            "SELECT id, email, rol, activo FROM usuarios WHERE id = ?",
            [payload.id]
        );

        if (!user || !user.activo) {
            return next(AppError("Usuario inactivo o inexistente", 403));
        }

        req.user = { id: user.id, email: user.email, rol: user.rol };
        next();
    } catch (error) {
        next(error);
    }
}
