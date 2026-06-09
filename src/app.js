import express from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
// TODO: app.use("/api/menus", menuRoutes);
// TODO: app.use("/api/pedidos", pedidosRoutes);

app.use(errorHandler);

export default app;
