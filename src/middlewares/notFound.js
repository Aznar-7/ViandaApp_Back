import {createAppError} from "../utils/AppErrors.js";

export const notFound = (req, res, next) => {
    next(createAppError("Recurso no encontrado", 404));
}