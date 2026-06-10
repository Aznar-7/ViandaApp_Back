import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../database/db.js";
import { JWT_AUDIENCE, JWT_ISSUER, JWT_SECRET } from "../config/env.js";
import { AppError } from "../utils/AppErrors.js";

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;

export async function register(nombre, email, password) {
    const db = await getDb();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = nombre.trim();

    const existente = await db.get("SELECT id FROM usuarios WHERE LOWER(email) = ?", [normalizedEmail]);
    if (existente) throw AppError("El email ya esta registrado", 409);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    let lastID;
    try {
        ({ lastID } = await db.run(
            "INSERT INTO usuarios (nombre, email, passwordHash, rol, activo) VALUES (?, ?, ?, ?, ?)",
            [normalizedName, normalizedEmail, passwordHash, "usuario", 1]
        ));
    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT") {
            throw AppError("El email ya esta registrado", 409);
        }
        throw error;
    }

    return { id: lastID, nombre: normalizedName, email: normalizedEmail, rol: "usuario", activo: 1 };
}

export async function login(email, password) {
    const db = await getDb();
    const normalizedEmail = email.trim().toLowerCase();

    const usuario = await db.get("SELECT * FROM usuarios WHERE LOWER(email) = ?", [normalizedEmail]);
    if (!usuario) throw AppError("Credenciales invalidas", 401);
    if (!usuario.activo) throw AppError("Usuario inactivo", 403);

    const valida = await bcrypt.compare(password, usuario.passwordHash);
    if (!valida) throw AppError("Credenciales invalidas", 401);

    const token = jwt.sign(
        { id: usuario.id, email: usuario.email, rol: usuario.rol },
        JWT_SECRET,
        { expiresIn: "8h", issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
    );

    const { passwordHash, ...usuarioSinHash } = usuario;
    return { token, usuario: usuarioSinHash };
}
