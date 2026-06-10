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

router.post("/register", authLimiter, validate(registerSchema), authController.register);
router.post("/login",    authLimiter, validate(loginSchema),    authController.login);

export default router;