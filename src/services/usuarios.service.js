import bcrypt from "bcryptjs";
import { getDb } from "../database/db.js";
import { AppError } from "../utils/AppErrors.js";

const USUARIO_SELECT = "id, nombre, email, rol, activo";
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;

export async function listarUsuarios({ rol, activo } = {}) {
    const db = await getDb();
    const condiciones = [];
    const params = [];

    if (rol) {
        condiciones.push("rol = ?");
        params.push(rol);
    }
    if (activo !== undefined) {
        condiciones.push("activo = ?");
        params.push(activo);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
    return db.all(`SELECT ${USUARIO_SELECT} FROM usuarios ${where} ORDER BY nombre ASC`, params);
}

export async function obtenerUsuario(id) {
    const db = await getDb();
    const usuario = await db.get(`SELECT ${USUARIO_SELECT} FROM usuarios WHERE id = ?`, [id]);
    if (!usuario) throw AppError("Usuario no encontrado", 404);
    return usuario;
}

export async function crearUsuario({ nombre, email, password, rol, activo }) {
    const db = await getDb();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = nombre.trim();
    if (normalizedName.length < 2) throw AppError("El nombre debe tener al menos 2 caracteres", 400);
    const existente = await db.get("SELECT id FROM usuarios WHERE LOWER(email) = ?", [normalizedEmail]);
    if (existente) throw AppError("El email ya esta registrado", 409);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    try {
        const { lastID } = await db.run(
            "INSERT INTO usuarios (nombre, email, passwordHash, rol, activo) VALUES (?, ?, ?, ?, ?)",
            [normalizedName, normalizedEmail, passwordHash, rol, activo]
        );
        return obtenerUsuario(lastID);
    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT") throw AppError("El email ya esta registrado", 409);
        throw error;
    }
}

export async function editarUsuario(id, adminId, { nombre, email, rol, activo }) {
    if ([nombre, email, rol, activo].every(value => value === undefined)) {
        throw AppError("Debes enviar al menos un campo para editar", 400);
    }
    if (id === adminId && (rol === "usuario" || activo === 0)) {
        throw AppError("No podes quitarte el rol admin ni desactivar tu propio usuario", 400);
    }

    const db = await getDb();
    const usuario = await db.get("SELECT * FROM usuarios WHERE id = ?", [id]);
    if (!usuario) throw AppError("Usuario no encontrado", 404);

    const normalizedEmail = email?.trim().toLowerCase() ?? usuario.email;
    const normalizedName = nombre?.trim() ?? usuario.nombre;
    if (normalizedName.length < 2) throw AppError("El nombre debe tener al menos 2 caracteres", 400);

    if (normalizedEmail !== usuario.email) {
        const existente = await db.get(
            "SELECT id FROM usuarios WHERE LOWER(email) = ? AND id != ?",
            [normalizedEmail, id]
        );
        if (existente) throw AppError("El email ya esta registrado", 409);
    }

    try {
        await db.run(
            `UPDATE usuarios SET nombre = ?, email = ?, rol = ?, activo = ? WHERE id = ?`,
            [normalizedName, normalizedEmail, rol ?? usuario.rol, activo ?? usuario.activo, id]
        );
    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT") throw AppError("El email ya esta registrado", 409);
        throw error;
    }

    return obtenerUsuario(id);
}

export async function cambiarActivo(id, adminId, activo) {
    return editarUsuario(id, adminId, { activo });
}
