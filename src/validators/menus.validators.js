import { TIPOS_MENU } from "../domain/constants.js";

export const crearMenuSchema = {
    nombre:      { required: true,  type: "string", minLength: 2, maxLength: 120 },
    descripcion: { required: true,  type: "string", minLength: 2, maxLength: 500 },
    fecha:       { required: true,  type: "string", date: true },
    tipo:        { required: true,  type: "string", enum: TIPOS_MENU },
    precio:      { required: true,  type: "number", min: 0.01 },
    cupoDiario:  { required: true,  type: "number", integer: true, min: 1 },
    activo:      { required: true,  type: "number", integer: true, enum: [0, 1] },
    imagenUrl:   { required: false, type: "string", maxLength: 500 },
};

export const editarMenuSchema = {
    nombre:      { required: false, type: "string", minLength: 2, maxLength: 120 },
    descripcion: { required: false, type: "string", minLength: 2, maxLength: 500 },
    fecha:       { required: false, type: "string", date: true },
    tipo:        { required: false, type: "string", enum: TIPOS_MENU },
    precio:      { required: false, type: "number", min: 0.01 },
    cupoDiario:  { required: false, type: "number", integer: true, min: 1 },
    activo:      { required: false, type: "number", integer: true, enum: [0, 1] },
    imagenUrl:   { required: false, type: "string", maxLength: 500 },
};
