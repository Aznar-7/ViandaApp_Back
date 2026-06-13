import path from "path";
import { fileURLToPath } from "url";
import { closeDb, getDb, withTransaction } from "./db.js";
import { seedSedes } from "./seedSedes.js";

export async function syncSedes() {
    const db = await getDb();
    let inserted = 0;
    let existingCount = 0;

    await withTransaction(async txDb => {
        for (const [nombre, direccion, activo] of seedSedes) {
            const existingSede = await txDb.get("SELECT id FROM sedes WHERE nombre = ?", [nombre]);

            if (existingSede) {
                existingCount++;
            } else {
                await txDb.run(
                    "INSERT INTO sedes (nombre, direccion, activo) VALUES (?, ?, ?)",
                    [nombre, direccion, activo]
                );
                inserted++;
            }
        }
    });

    console.log(`Sedes sincronizadas. Existentes: ${existingCount}. Insertadas: ${inserted}.`);
    return { existing: existingCount, inserted };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    syncSedes()
        .catch(error => {
            console.error("Error sincronizando sedes:", error);
            process.exitCode = 1;
        })
        .finally(closeDb);
}
