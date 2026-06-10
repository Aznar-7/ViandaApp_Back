import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.js";
import { registerSchema, loginSchema } from "../validators/auth.validators.js";

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Demasiados intentos. Intentá de nuevo en 15 minutos." },
});

const router = Router();

function normalizeAuthBody(req, res, next) {
    if (typeof req.body.email === "string") req.body.email = req.body.email.trim().toLowerCase();
    if (typeof req.body.nombre === "string") req.body.nombre = req.body.nombre.trim();
    next();
}

router.post("/register", authLimiter, normalizeAuthBody, validate(registerSchema), authController.register);
router.post("/login",    authLimiter, normalizeAuthBody, validate(loginSchema),    authController.login);

export default router;
