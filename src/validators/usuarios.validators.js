import { ROLES } from "../domain/constants.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const crearUsuarioSchema = {
    nombre:   { required: true, type: "string", minLength: 2, maxLength: 100 },
    email:    { required: true, type: "string", pattern: emailPattern },
    password: { required: true, type: "string", minLength: 6, maxLength: 72 },
    rol:      { required: true, type: "string", enum: ROLES },
    activo:   { required: true, type: "number", integer: true, enum: [0, 1] },
};

export const editarUsuarioSchema = {
    nombre: { required: false, type: "string", minLength: 2, maxLength: 100 },
    email:  { required: false, type: "string", pattern: emailPattern },
    rol:    { required: false, type: "string", enum: ROLES },
    activo: { required: false, type: "number", integer: true, enum: [0, 1] },
};
