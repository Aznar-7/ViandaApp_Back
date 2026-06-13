import { Router } from "express";
import * as usuariosController from "../controllers/usuarios.controller.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate.js";
import { validateIdParam } from "../middlewares/validateIdParam.js";
import { crearUsuarioSchema, editarUsuarioSchema } from "../validators/usuarios.validators.js";

const router = Router();

router.use(authenticate, authorize("admin"));
router.get("/", usuariosController.listarUsuarios);
router.post("/", validate(crearUsuarioSchema), usuariosController.crearUsuario);
router.use("/:id", validateIdParam);
router.get("/:id", usuariosController.obtenerUsuario);
router.put("/:id", validate(editarUsuarioSchema), usuariosController.editarUsuario);
router.patch("/:id/activar", usuariosController.activarUsuario);
router.patch("/:id/desactivar", usuariosController.desactivarUsuario);

export default router;
