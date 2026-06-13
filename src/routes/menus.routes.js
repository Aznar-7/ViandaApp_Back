import { Router } from "express";
import * as menusController from "../controllers/menus.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { validateIdParam } from "../middlewares/validateIdParam.js";
import { crearMenuSchema, editarMenuSchema } from "../validators/menus.validators.js";

const router = Router();

router.get("/", menusController.listarMenus);
router.post("/", authenticate, authorize("admin"), validate(crearMenuSchema), menusController.crearMenu);

router.use("/:id", authenticate, authorize("admin"), validateIdParam);
router.get("/:id", menusController.obtenerMenu);
router.put("/:id", validate(editarMenuSchema), menusController.editarMenu);
router.patch("/:id/activar", menusController.activarMenu);
router.patch("/:id/desactivar", menusController.desactivarMenu);

export default router;
