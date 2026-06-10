import { Router } from "express";
import * as pedidosController from "../controllers/pedidos.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { crearPedidoSchema, editarPedidoSchema } from "../validators/pedidos.validators.js";

const router = Router();

router.use(authenticate);

router.get("/",              pedidosController.listarPedidos);
router.get("/resumen",       authorize("admin"), pedidosController.obtenerResumen);
router.get("/:id",           pedidosController.obtenerPedido);
router.get("/:id/historial", pedidosController.obtenerHistorial);

router.post("/",   validate(crearPedidoSchema),  pedidosController.crearPedido);
router.put("/:id", validate(editarPedidoSchema), pedidosController.editarPedido);

router.patch("/:id/cancelar",  pedidosController.cancelarPedido);
router.patch("/:id/confirmar", authorize("admin"), pedidosController.confirmarPedido);
router.patch("/:id/entregar",  authorize("admin"), pedidosController.entregarPedido);

export default router;
