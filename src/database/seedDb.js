import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import { getDb } from "./db.js";
import { seedMenus } from "./seedMenus.js";
import { seedSedes } from "./seedSedes.js";
import { syncSedes } from "./syncSedes.js";

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;

export async function seedDb() {
    const db = await getDb();

    await syncSedes();
    const sedeIds = new Map(
        (await db.all("SELECT id, nombre FROM sedes")).map(sede => [sede.nombre, sede.id])
    );

    const { count } = await db.get("SELECT COUNT(*) AS count FROM usuarios");
    if (count > 0) {
        console.log("Sedes sincronizadas. Los demas datos ya fueron sembrados.");
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
            [1, 2, "2026-06-09", 2, "almuerzo", 1, 2400, "confirmado", null],
            [1, 2, "2026-06-09", 1, "cena", 1, 1200, "entregado", null],
            [2, 3, "2026-06-09", 3, "almuerzo", 2, 2700, "pendiente", null],
            [2, 3, "2026-06-09", 1, "cena", 2, 900, "cancelado", "Cambio de turno"],
            [3, 2, "2026-06-10", 2, "almuerzo", 1, 2000, "pendiente", null],
            [3, 3, "2026-06-10", 1, "cena", 3, 1000, "pendiente", null],
            [4, 2, "2026-06-10", 2, "almuerzo", 1, 2600, "confirmado", null],
            [4, 3, "2026-06-10", 1, "almuerzo", 2, 1300, "confirmado", null],
            [5, 2, "2026-06-11", 3, "cena", 1, 2400, "pendiente", null],
            [5, 3, "2026-06-11", 2, "almuerzo", 3, 1600, "pendiente", null],
            [6, 2, "2026-06-11", 1, "cena", 1, 950, "cancelado", "No podre retirar"],
            [6, 3, "2026-06-11", 2, "almuerzo", 2, 1900, "pendiente", null],
            [7, 2, "2026-06-12", 2, "almuerzo", 1, 2200, "confirmado", "Sin picante"],
            [7, 3, "2026-06-12", 1, "cena", 3, 1100, "pendiente", null],
            [8, 2, "2026-06-12", 1, "cena", 1, 1250, "entregado", null],
            [8, 3, "2026-06-12", 2, "almuerzo", 2, 2500, "confirmado", null],
            [9, 2, "2026-06-12", 2, "almuerzo", 1, 2900, "pendiente", null],
            [9, 3, "2026-06-12", 1, "cena", 3, 1450, "cancelado", "Cambio de planes"],
            [10, 2, "2026-06-13", 3, "cena", 1, 4650, "confirmado", null],
            [10, 3, "2026-06-13", 2, "almuerzo", 2, 3100, "pendiente", null],
            [11, 2, "2026-06-13", 1, "almuerzo", 1, 1800, "entregado", "Que la Fuerza acompane al chef"],
            [11, 3, "2026-06-13", 2, "cena", 3, 3600, "confirmado", null],
            [12, 2, "2026-06-13", 2, "almuerzo", 1, 2700, "pendiente", "Servir bien fria"],
            [12, 3, "2026-06-13", 1, "cena", 2, 1350, "cancelado", "Los droides no desayunan"],
        ];

        const ahora = new Date().toISOString();
        for (const [menuId, usuarioId, fecha, cantidad, turnoEntrega, sedeSeedId, total, estado, observaciones] of pedidos) {
            const puntoRetiroId = sedeIds.get(seedSedes[sedeSeedId - 1][0]);
            const { lastID } = await db.run(
                `INSERT INTO pedidos (menuId, usuarioId, fecha, cantidad, turnoEntrega, puntoRetiroId, total, estado, observaciones)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [menuId, usuarioId, fecha, cantidad, turnoEntrega, puntoRetiroId, total, estado, observaciones]
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
