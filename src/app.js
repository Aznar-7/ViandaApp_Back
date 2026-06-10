import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middlewares/errorHandler.js";
import { CORS_ORIGIN } from "./config/env.js";
import authRoutes    from "./routes/auth.routes.js";
import menusRoutes   from "./routes/menus.routes.js";
import pedidosRoutes from "./routes/pedidos.routes.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN.split(",").map(o => o.trim()) }));
app.use(express.json({ limit: "10kb" }));
if (!process.env.JEST_WORKER_ID) app.use(morgan("dev"));

app.use("/api/auth",    authRoutes);
app.use("/api/menus",   menusRoutes);
app.use("/api/pedidos", pedidosRoutes);

app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada" }));
app.use(errorHandler);

export default app;
