const fechaPattern = /^\d{4}-\d{2}-\d{2}$/;

export const crearPedidoSchema = {
    menuId:        { required: true,  type: "number" },
    fecha:         { required: true,  type: "string", pattern: fechaPattern },
    cantidad:      { required: true,  type: "number", min: 1 },
    turnoEntrega:  { required: true,  type: "string", enum: ["almuerzo", "cena"] },
    puntoRetiro:   { required: true,  type: "string", minLength: 2, maxLength: 200 },
    observaciones: { required: false, type: "string", maxLength: 500 },
};

export const editarPedidoSchema = {
    cantidad:      { required: false, type: "number", min: 1 },
    turnoEntrega:  { required: false, type: "string", enum: ["almuerzo", "cena"] },
    puntoRetiro:   { required: false, type: "string", minLength: 2, maxLength: 200 },
    observaciones: { required: false, type: "string", maxLength: 500 },
};
