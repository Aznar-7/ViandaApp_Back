export const crearPedidoSchema = {
    menuId:        { required: true,  type: "number" },
    fecha:         { required: true,  type: "string" },
    cantidad:      { required: true,  type: "number", min: 1 },
    turnoEntrega:  { required: true,  type: "string" },
    puntoRetiro:   { required: true,  type: "string" },
    observaciones: { required: false, type: "string" },
};

export const editarPedidoSchema = {
    cantidad:      { required: false, type: "number", min: 1 },
    turnoEntrega:  { required: false, type: "string" },
    puntoRetiro:   { required: false, type: "string" },
    observaciones: { required: false, type: "string" },
};
