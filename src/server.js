import app from "./app.js";
import { PORT, JWT_SECRET } from "./config/env.js";

if (!JWT_SECRET || JWT_SECRET === "your_jwt_secret_key") {
    console.error("FATAL: JWT_SECRET no está configurado en .env. El servidor no puede arrancar.");
    process.exit(1);
}

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
