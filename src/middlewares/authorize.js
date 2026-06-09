import { AppError } from "../utils/AppErrors.js";

export function authorize(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.rol)) {
            return next(AppError("No tenés permisos para esta acción", 403));
        }
        next();
    };
}
