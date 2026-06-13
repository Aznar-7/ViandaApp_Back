import { Router } from "express";
import * as sedesController from "../controllers/sedes.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { validateIdParam } from "../middlewares/validateIdParam.js";
import { crearSedeSchema, editarSedeSchema } from "../validators/sedes.validators.js";

const router = Router();

router.get("/", sedesController.listarSedes);
router.post("/", authenticate, authorize("admin"), validate(crearSedeSchema), sedesController.crearSede);

router.use("/:id", authenticate, authorize("admin"), validateIdParam);
router.get("/:id", sedesController.obtenerSede);
router.put("/:id", validate(editarSedeSchema), sedesController.editarSede);
router.patch("/:id/activar", sedesController.activarSede);
router.patch("/:id/desactivar", sedesController.desactivarSede);

export default router;
