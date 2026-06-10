import { Router } from "express";
import * as menusController from "../controllers/menus.controller.js";

const router = Router();

router.get("/", menusController.listarMenus);
//router.get('/:id', menusController.obtenerMenu);


export default router;
