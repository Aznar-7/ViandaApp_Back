export const crearSedeSchema = {
    nombre:    { required: true, type: "string", minLength: 2, maxLength: 120 },
    direccion: { required: true, type: "string", minLength: 2, maxLength: 250 },
    activo:    { required: true, type: "number", integer: true, enum: [0, 1] },
};

export const editarSedeSchema = {
    nombre:    { required: false, type: "string", minLength: 2, maxLength: 120 },
    direccion: { required: false, type: "string", minLength: 2, maxLength: 250 },
    activo:    { required: false, type: "number", integer: true, enum: [0, 1] },
};
