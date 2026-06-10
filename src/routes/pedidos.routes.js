import { Router } from "express";
import * as pedidosController from "../controllers/pedidos.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";

const router = Router();

router.use(authenticate);

router.get("/",              pedidosController.listarPedidos);
router.get("/resumen",       authorize("admin"), pedidosController.obtenerResumen);
router.get("/:id",           pedidosController.obtenerPedido);
router.get("/:id/historial", pedidosController.obtenerHistorial);

router.post("/",   pedidosController.crearPedido);
router.put("/:id", pedidosController.editarPedido);

router.patch("/:id/cancelar",  pedidosController.cancelarPedido);
router.patch("/:id/confirmar", authorize("admin"), pedidosController.confirmarPedido);
router.patch("/:id/entregar",  authorize("admin"), pedidosController.entregarPedido);

export default router;
