import app from "./app.js";
import { JWT_SECRET, PORT, SEED_ON_START } from "./config/env.js";
import { initDb } from "./database/initDb.js";
import { seedDb } from "./database/seedDb.js";

if (!JWT_SECRET) {
    console.error("FATAL: JWT_SECRET no está configurado en .env. El servidor no puede arrancar.");
    process.exit(1);
}

try {
    await initDb();
    if (SEED_ON_START) await seedDb();

    app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
} catch (error) {
    console.error("FATAL: no se pudo inicializar el servidor:", error);
    process.exit(1);
}
