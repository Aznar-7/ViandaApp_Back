import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import { getDb } from "./db.js";

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;

export async function seedDb() {
    const db = await getDb();

    // Evitar doble seed
    const { count } = await db.get("SELECT COUNT(*) as count FROM usuarios");
    if (count > 0) {
        console.log("Los datos ya fueron sembrados, saliendo.");
        return;
    }

    // ── Usuarios ──────────────────────────────────────────────────────────────
    const passAdmin = await bcrypt.hash("admin123", BCRYPT_ROUNDS);
    const passUser  = await bcrypt.hash("user123",  BCRYPT_ROUNDS);

    await db.run("BEGIN");
    try {
        await db.run(
            "INSERT INTO usuarios (nombre, email, passwordHash, rol, activo) VALUES (?, ?, ?, ?, ?)",
            ["Admin",         "admin@viandas.com", passAdmin, "admin",   1]
        );
        await db.run(
            "INSERT INTO usuarios (nombre, email, passwordHash, rol, activo) VALUES (?, ?, ?, ?, ?)",
            ["Juan Pérez",    "juan@viandas.com",  passUser,  "usuario", 1]
        );
        await db.run(
            "INSERT INTO usuarios (nombre, email, passwordHash, rol, activo) VALUES (?, ?, ?, ?, ?)",
            ["María García",  "maria@viandas.com", passUser,  "usuario", 1]
        );

        // ── Menús ─────────────────────────────────────────────────────────────
        const menus = [
            ["Milanesa con puré",    "Milanesa de ternera con puré de papas",        "2026-06-09", "clasico",      1200, 15, 1],
            ["Tarta de verduras",    "Tarta integral de espinaca y ricota",           "2026-06-09", "vegetariano",   900, 10, 1],
            ["Bowl vegano",          "Bowl de quinoa con vegetales asados",           "2026-06-10", "vegano",       1000,  8, 1],
            ["Pollo al horno",       "Pollo con hierbas, sin TACC, con ensalada",     "2026-06-10", "sin_tacc",     1300, 12, 1],
            ["Pasta con salsa",      "Tallarines con salsa bolognesa casera",         "2026-06-11", "clasico",       800, 20, 1],
            ["Ensalada proteica",    "Mix de legumbres, semillas y vegetales frescos","2026-06-11", "vegano",        950,  6, 1],
        ];

        for (const [nombre, descripcion, fecha, tipo, precio, cupoDiario, activo] of menus) {
            const imagenUrl = nombre.startsWith("Milanesa") ? "/assets/mondongo.jpg" : null;
            await db.run(
                "INSERT INTO menus (nombre, descripcion, fecha, tipo, precio, cupoDiario, activo, imagenUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [nombre, descripcion, fecha, tipo, precio, cupoDiario, activo, imagenUrl]
            );
        }

        // ── Pedidos ───────────────────────────────────────────────────────────
        // total = precio * cantidad (calculado acá como lo haría el servicio)
        const pedidos = [
            [1, 2, "2026-06-09", 2, "almuerzo", "Sede central", 2400, "confirmado", null],
            [1, 2, "2026-06-09", 1, "cena",     "Sede central", 1200, "entregado",  null],
            [2, 3, "2026-06-09", 3, "almuerzo", "Sede norte",   2700, "pendiente",  null],
            [2, 3, "2026-06-09", 1, "cena",     "Sede norte",    900, "cancelado",  "Cambió de turno"],
            [3, 2, "2026-06-10", 2, "almuerzo", "Sede central", 2000, "pendiente",  null],
            [3, 3, "2026-06-10", 1, "cena",     "Sede sur",     1000, "pendiente",  null],
            [4, 2, "2026-06-10", 2, "almuerzo", "Sede central", 2600, "confirmado", null],
            [4, 3, "2026-06-10", 1, "almuerzo", "Sede norte",   1300, "confirmado", null],
            [5, 2, "2026-06-11", 3, "cena",     "Sede central", 2400, "pendiente",  null],
            [5, 3, "2026-06-11", 2, "almuerzo", "Sede sur",     1600, "pendiente",  null],
            [6, 2, "2026-06-11", 1, "cena",     "Sede central",  950, "cancelado",  "No podré retirar"],
            [6, 3, "2026-06-11", 2, "almuerzo", "Sede norte",   1900, "pendiente",  null],
        ];

        const ahora = new Date().toISOString();

        for (const [menuId, usuarioId, fecha, cantidad, turnoEntrega, puntoRetiro, total, estado, observaciones] of pedidos) {
            const { lastID } = await db.run(
                `INSERT INTO pedidos (menuId, usuarioId, fecha, cantidad, turnoEntrega, puntoRetiro, total, estado, observaciones)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [menuId, usuarioId, fecha, cantidad, turnoEntrega, puntoRetiro, total, estado, observaciones]
            );

            await db.run(
                `INSERT INTO historial_pedidos (pedidoId, usuarioId, accion, fechaHora, valorNuevo)
                 VALUES (?, ?, ?, ?, ?)`,
                [lastID, usuarioId, "creacion", ahora, JSON.stringify({ estado })]
            );
        }

        await db.run("COMMIT");
    } catch (err) {
        await db.run("ROLLBACK");
        throw err;
    }

    console.log("Datos sembrados correctamente.");
    console.log("  Admin:   admin@viandas.com  /  admin123");
    console.log("  Usuario: juan@viandas.com   /  user123");
    console.log("  Usuario: maria@viandas.com  /  user123");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    seedDb().catch((error) => {
        console.error("Error sembrando datos:", error);
        process.exitCode = 1;
    });
}
