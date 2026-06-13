import { Router } from "express";
import * as sedesController from "../controllers/sedes.controller.js";

const router = Router();

router.get("/", sedesController.listarSedes);

export default router;
