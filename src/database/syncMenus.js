import path from "path";
import { fileURLToPath } from "url";
import { closeDb, getDb, withTransaction } from "./db.js";
import { seedMenus } from "./seedMenus.js";

export async function syncMenus() {
    const db = await getDb();
    const existing = await db.all("SELECT id FROM menus ORDER BY id LIMIT 12");
    let inserted = 0;
    let existingCount = 0;

    await withTransaction(async txDb => {
        for (const [index, menu] of seedMenus.entries()) {
            const id = index + 1;
            const [nombre, descripcion, fecha, tipo, precio, cupoDiario, activo, imagenUrl] = menu;

            if (existing.some(row => row.id === id)) {
                existingCount++;
            } else {
                await txDb.run(
                    `INSERT INTO menus (id, nombre, descripcion, fecha, tipo, precio, cupoDiario, activo, imagenUrl)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [id, nombre, descripcion, fecha, tipo, precio, cupoDiario, activo, imagenUrl]
                );
                inserted++;
            }
        }
    });

    console.log(`Menus sincronizados. Existentes: ${existingCount}. Insertados: ${inserted}.`);
    return { existing: existingCount, inserted };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    syncMenus()
        .catch(error => {
            console.error("Error sincronizando menus:", error);
            process.exitCode = 1;
        })
        .finally(closeDb);
}
