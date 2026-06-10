import { AppError } from "../utils/AppErrors.js";

export function validateIdParam(req, res, next) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return next(AppError("\"id\" debe ser un numero entero positivo", 400));
    }

    req.validatedId = id;
    next();
}
