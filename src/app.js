import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { errorHandler } from "./middlewares/errorHandler.js";
import { CORS_ORIGINS, TRUST_PROXY_HOPS } from "./config/env.js";
import { getDb } from "./database/db.js";
import { asyncHandler } from "./utils/asyncHandler.js";
import authRoutes    from "./routes/auth.routes.js";
import menusRoutes   from "./routes/menus.routes.js";
import pedidosRoutes from "./routes/pedidos.routes.js";
import sedesRoutes   from "./routes/sedes.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";

const app = express();

app.set("trust proxy", TRUST_PROXY_HOPS === 0 ? false : TRUST_PROXY_HOPS);

const assetsPath = fileURLToPath(new URL("./assets", import.meta.url));

app.use(helmet());
app.use(cors({
    origin(origin, callback) {
        const allowed = !origin || CORS_ORIGINS.includes(origin.replace(/\/$/, ""));
        callback(null, allowed);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
}));
app.use(express.json({ limit: "10kb" }));
if (!process.env.JEST_WORKER_ID) app.use(morgan("dev"));

app.use("/assets", express.static(path.resolve(assetsPath), {
    maxAge: "1d",
    setHeaders: res => res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"),
}));

app.get("/", (req, res) => {
    res.json({ service: "viandas-api", status: "ok" });
});

app.get("/api/health", asyncHandler(async (req, res) => {
    const db = await getDb();
    await db.get("SELECT 1");
    res.json({ status: "ok", database: "connected" });
}));

app.use("/api/auth",    authRoutes);
app.use("/api/menus",   menusRoutes);
app.use("/api/pedidos", pedidosRoutes);
app.use("/api/sedes",   sedesRoutes);
app.use("/api/usuarios", usuariosRoutes);

app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada" }));
app.use(errorHandler);

export default app;
