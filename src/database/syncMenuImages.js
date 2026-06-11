import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { closeDb, getDb } from "./db.js";

const assetsPath = fileURLToPath(new URL("../assets", import.meta.url));

const menuImages = [
    [["Milanesa con pure", "Milanesa con puré"], "milanesa_con_pure.png"],
    [["Tarta de verduras"], "tarta_de_verduras.jpg"],
    [["Bowl vegano"], "bowl_vegano.jpeg"],
    [["Pollo al horno"], "pollo_al_horno.jpg"],
    [["Pasta con salsa"], "pasta_con_salsa.jpg"],
    [["Ensalada proteica"], "ensalada_proteica.jpg"],
    [["Curry de garbanzos"], "curry_de_garbanzos.jpg"],
    [["Lasagna de berenjena"], "lasagna_de_berenjena.jpg"],
    [["Merluza con papas"], "merluza_con_papas.jpg"],
    [["Bondiola braseada"], "bondiola_braseada.jpg"],
    [["Estofado de Yoda"], "estofado_yoda.jpg"],
    [["Desayuno de leche azul"], "desayuno_leche_azul.jpg"],
];

export async function syncMenuImages() {
    const db = await getDb();
    let updated = 0;
    const missingMenus = [];

    for (const [nombres, fileName] of menuImages) {
        const filePath = path.join(assetsPath, fileName);
        if (!fs.existsSync(filePath)) {
            throw new Error(`No existe el asset requerido: ${filePath}`);
        }

        const placeholders = nombres.map(() => "?").join(", ");
        const result = await db.run(
            `UPDATE menus SET imagenUrl = ? WHERE nombre IN (${placeholders})`,
            [`/assets/${fileName}`, ...nombres]
        );
        updated += result.changes;
        if (result.changes === 0) missingMenus.push(nombres[0]);
    }

    console.log(`Imagenes actualizadas en ${updated} menus.`);
    if (missingMenus.length > 0) {
        console.log(`Menus no encontrados: ${missingMenus.join(", ")}`);
    }

    return { updated, missingMenus };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    syncMenuImages()
        .catch(error => {
            console.error("Error sincronizando imagenes:", error);
            process.exitCode = 1;
        })
        .finally(closeDb);
}
