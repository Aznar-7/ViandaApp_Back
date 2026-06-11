import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import { getDb } from "./db.js";
import { seedMenus } from "./seedMenus.js";

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;

export async function seedDb() {
    const db = await getDb();

    const { count } = await db.get("SELECT COUNT(*) AS count FROM usuarios");
    if (count > 0) {
        console.log("Los datos ya fueron sembrados, saliendo.");
        return;
    }

    const passAdmin = await bcrypt.hash("admin123", BCRYPT_ROUNDS);
    const passUser = await bcrypt.hash("user123", BCRYPT_ROUNDS);

    await db.run("BEGIN");
    try {
        await db.run(
            "INSERT INTO usuarios (nombre, email, passwordHash, rol, activo) VALUES (?, ?, ?, ?, ?)",
            ["Admin", "admin@viandas.com", passAdmin, "admin", 1]
        );
        await db.run(
            "INSERT INTO usuarios (nombre, email, passwordHash, rol, activo) VALUES (?, ?, ?, ?, ?)",
            ["Juan Perez", "juan@viandas.com", passUser, "usuario", 1]
        );
        await db.run(
            "INSERT INTO usuarios (nombre, email, passwordHash, rol, activo) VALUES (?, ?, ?, ?, ?)",
            ["Maria Garcia", "maria@viandas.com", passUser, "usuario", 1]
        );

        for (const [nombre, descripcion, fecha, tipo, precio, cupoDiario, activo, imagenUrl] of seedMenus) {
            await db.run(
                "INSERT INTO menus (nombre, descripcion, fecha, tipo, precio, cupoDiario, activo, imagenUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [nombre, descripcion, fecha, tipo, precio, cupoDiario, activo, imagenUrl]
            );
        }

        const pedidos = [
            [1, 2, "2026-06-09", 2, "almuerzo", "Sede central", 2400, "confirmado", null],
            [1, 2, "2026-06-09", 1, "cena", "Sede central", 1200, "entregado", null],
            [2, 3, "2026-06-09", 3, "almuerzo", "Sede norte", 2700, "pendiente", null],
            [2, 3, "2026-06-09", 1, "cena", "Sede norte", 900, "cancelado", "Cambio de turno"],
            [3, 2, "2026-06-10", 2, "almuerzo", "Sede central", 2000, "pendiente", null],
            [3, 3, "2026-06-10", 1, "cena", "Sede sur", 1000, "pendiente", null],
            [4, 2, "2026-06-10", 2, "almuerzo", "Sede central", 2600, "confirmado", null],
            [4, 3, "2026-06-10", 1, "almuerzo", "Sede norte", 1300, "confirmado", null],
            [5, 2, "2026-06-11", 3, "cena", "Sede central", 2400, "pendiente", null],
            [5, 3, "2026-06-11", 2, "almuerzo", "Sede sur", 1600, "pendiente", null],
            [6, 2, "2026-06-11", 1, "cena", "Sede central", 950, "cancelado", "No podre retirar"],
            [6, 3, "2026-06-11", 2, "almuerzo", "Sede norte", 1900, "pendiente", null],
            [7, 2, "2026-06-12", 2, "almuerzo", "Sede central", 2200, "confirmado", "Sin picante"],
            [7, 3, "2026-06-12", 1, "cena", "Sede sur", 1100, "pendiente", null],
            [8, 2, "2026-06-12", 1, "cena", "Sede central", 1250, "entregado", null],
            [8, 3, "2026-06-12", 2, "almuerzo", "Sede norte", 2500, "confirmado", null],
            [9, 2, "2026-06-12", 2, "almuerzo", "Sede central", 2900, "pendiente", null],
            [9, 3, "2026-06-12", 1, "cena", "Sede sur", 1450, "cancelado", "Cambio de planes"],
            [10, 2, "2026-06-13", 3, "cena", "Sede central", 4650, "confirmado", null],
            [10, 3, "2026-06-13", 2, "almuerzo", "Sede norte", 3100, "pendiente", null],
            [11, 2, "2026-06-13", 1, "almuerzo", "Sede central", 1800, "entregado", "Que la Fuerza acompane al chef"],
            [11, 3, "2026-06-13", 2, "cena", "Sede sur", 3600, "confirmado", null],
            [12, 2, "2026-06-13", 2, "almuerzo", "Sede central", 2700, "pendiente", "Servir bien fria"],
            [12, 3, "2026-06-13", 1, "cena", "Sede norte", 1350, "cancelado", "Los droides no desayunan"],
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
    } catch (error) {
        await db.run("ROLLBACK");
        throw error;
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
