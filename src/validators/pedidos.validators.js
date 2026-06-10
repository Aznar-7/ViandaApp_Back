import { TURNOS_ENTREGA } from "../domain/constants.js";

export const crearPedidoSchema = {
    menuId:        { required: true,  type: "number", integer: true, min: 1 },
    fecha:         { required: true,  type: "string", date: true },
    cantidad:      { required: true,  type: "number", integer: true, min: 1 },
    turnoEntrega:  { required: true,  type: "string", enum: TURNOS_ENTREGA },
    puntoRetiro:   { required: true,  type: "string", minLength: 2, maxLength: 200 },
    observaciones: { required: false, type: "string", maxLength: 500 },
};

export const editarPedidoSchema = {
    cantidad:      { required: false, type: "number", integer: true, min: 1 },
    turnoEntrega:  { required: false, type: "string", enum: TURNOS_ENTREGA },
    puntoRetiro:   { required: false, type: "string", minLength: 2, maxLength: 200 },
    observaciones: { required: false, type: "string", maxLength: 500 },
};
