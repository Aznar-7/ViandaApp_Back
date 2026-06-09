import { AppError } from "../utils/AppErrors.js";

export function validate(schema) {
    return (req, res, next) => {
        const errores = [];

        for (const [campo, reglas] of Object.entries(schema)) {
            const valor = req.body[campo];
            const ausente = valor === undefined || valor === null || valor === "";

            if (reglas.required && ausente) {
                errores.push(`"${campo}" es obligatorio`);
                continue;
            }

            if (ausente) continue;

            if (reglas.type && typeof valor !== reglas.type) {
                errores.push(`"${campo}" debe ser de tipo ${reglas.type}`);
                continue;
            }

            if (reglas.min !== undefined && valor < reglas.min) {
                errores.push(`"${campo}" debe ser mayor o igual a ${reglas.min}`);
            }
        }

        if (errores.length > 0) {
            return next(AppError(errores.join(" | "), 400));
        }

        next();
    };
}
