import { AppError } from "../utils/AppErrors.js";
import { isValidDateString } from "../utils/date.js";

export function validate(schema, { rejectUnknown = true } = {}) {
    return (req, res, next) => {
        const errores = [];

        if (rejectUnknown) {
            for (const campo of Object.keys(req.body)) {
                if (!Object.hasOwn(schema, campo)) {
                    errores.push(`"${campo}" no esta permitido`);
                }
            }
        }

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

            if (reglas.integer && !Number.isInteger(valor)) {
                errores.push(`"${campo}" debe ser un numero entero`);
            }

            if (reglas.date && !isValidDateString(valor)) {
                errores.push(`"${campo}" debe ser una fecha valida con formato YYYY-MM-DD`);
            }

            if (reglas.min !== undefined && valor < reglas.min) {
                errores.push(`"${campo}" debe ser mayor o igual a ${reglas.min}`);
            }

            if (reglas.minLength !== undefined && valor.length < reglas.minLength) {
                errores.push(`"${campo}" debe tener al menos ${reglas.minLength} caracteres`);
            }

            if (reglas.maxLength !== undefined && valor.length > reglas.maxLength) {
                errores.push(`"${campo}" no puede superar los ${reglas.maxLength} caracteres`);
            }

            if (reglas.enum && !reglas.enum.includes(valor)) {
                errores.push(`"${campo}" debe ser uno de: ${reglas.enum.join(", ")}`);
            }

            if (reglas.pattern && !reglas.pattern.test(valor)) {
                errores.push(`"${campo}" tiene un formato inválido`);
            }
        }

        if (errores.length > 0) {
            return next(AppError(errores.join(" | "), 400));
        }

        next();
    };
}
