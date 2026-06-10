import express from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler.js";
import authRoutes    from "./routes/auth.routes.js";
import menusRoutes   from "./routes/menus.routes.js";
import pedidosRoutes from "./routes/pedidos.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth",    authRoutes);
app.use("/api/menus",   menusRoutes);
app.use("/api/pedidos", pedidosRoutes);

app.use(errorHandler);

export default app;
