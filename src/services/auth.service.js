import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../database/db.js";
import { JWT_SECRET } from "../config/env.js";
import { AppError } from "../utils/AppErrors.js";

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;

export async function register(nombre, email, password, rol = "usuario") {
    const db = await getDb();

    const existente = await db.get("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (existente) throw AppError("El email ya está registrado", 400);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const { lastID } = await db.run(
        "INSERT INTO usuarios (nombre, email, passwordHash, rol, activo) VALUES (?, ?, ?, ?, ?)",
        [nombre, email, passwordHash, rol, 1]
    );

    return { id: lastID, nombre, email, rol, activo: 1 };
}

export async function login(email, password) {
    const db = await getDb();

    const usuario = await db.get("SELECT * FROM usuarios WHERE email = ?", [email]);
    if (!usuario) throw AppError("Credenciales inválidas", 401);
    if (!usuario.activo) throw AppError("Usuario inactivo", 403);

    const valida = await bcrypt.compare(password, usuario.passwordHash);
    if (!valida) throw AppError("Credenciales inválidas", 401);

    const token = jwt.sign(
        { id: usuario.id, email: usuario.email, rol: usuario.rol },
        JWT_SECRET,
        { expiresIn: "8h" }
    );

    const { passwordHash, ...usuarioSinHash } = usuario;
    return { token, usuario: usuarioSinHash };
}
