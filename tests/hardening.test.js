import request from "supertest";
import app from "../src/app.js";
import { closeDb, getDb } from "../src/database/db.js";

let adminToken;
let userToken;
let menuConcurrenteId;

beforeAll(async () => {
    const [adminRes, userRes] = await Promise.all([
        request(app).post("/api/auth/login").send({ email: "admin@viandas.com", password: "admin123" }),
        request(app).post("/api/auth/login").send({ email: "juan@viandas.com", password: "user123" }),
    ]);
    adminToken = adminRes.body.token;
    userToken = userRes.body.token;

    const db = await getDb();
    const { lastID } = await db.run(
        `INSERT INTO menus (nombre, descripcion, fecha, tipo, precio, cupoDiario, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ["Menu concurrencia", "Test", "2030-01-01", "clasico", 100, 1, 1]
    );
    menuConcurrenteId = lastID;
});

afterAll(async () => {
    const db = await getDb();
    const pedidos = await db.all("SELECT id FROM pedidos WHERE menuId = ?", [menuConcurrenteId]);
    for (const { id } of pedidos) {
        await db.run("DELETE FROM historial_pedidos WHERE pedidoId = ?", [id]);
    }
    await db.run("DELETE FROM pedidos WHERE menuId = ?", [menuConcurrenteId]);
    await db.run("DELETE FROM menus WHERE id = ?", [menuConcurrenteId]);
    await db.run("UPDATE usuarios SET activo = 1 WHERE email = ?", ["juan@viandas.com"]);
    await closeDb();
});

describe("Hardening", () => {
    it("expone healthchecks para la plataforma", async () => {
        const [root, health] = await Promise.all([
            request(app).get("/"),
            request(app).get("/api/health"),
        ]);

        expect(root.status).toBe(200);
        expect(root.body.status).toBe("ok");
        expect(health.status).toBe(200);
        expect(health.body).toEqual({ status: "ok", database: "connected" });
    });

    it("permite solo origins configurados por CORS", async () => {
        const [allowed, secondAllowed, denied] = await Promise.all([
            request(app).get("/api/menus").set("Origin", "http://localhost:5173"),
            request(app).get("/api/menus").set("Origin", "https://viandas.example.com"),
            request(app).get("/api/menus").set("Origin", "https://frontend-no-autorizado.example"),
        ]);

        expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
        expect(secondAllowed.headers["access-control-allow-origin"]).toBe("https://viandas.example.com");
        expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("responde preflight para el frontend configurado", async () => {
        const res = await request(app)
            .options("/api/pedidos")
            .set("Origin", "http://localhost:5173")
            .set("Access-Control-Request-Method", "GET")
            .set("Access-Control-Request-Headers", "Authorization");

        expect(res.status).toBe(204);
        expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
        expect(res.headers["access-control-allow-headers"]).toContain("Authorization");
    });

    it("normaliza email y rechaza duplicados sin distinguir mayusculas", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ nombre: "Otro Admin", email: " ADMIN@VIANDAS.COM ", password: "secreto123" });

        expect(res.status).toBe(409);
    });

    it("revoca acceso cuando el usuario es desactivado", async () => {
        const db = await getDb();
        await db.run("UPDATE usuarios SET activo = 0 WHERE email = ?", ["juan@viandas.com"]);

        const res = await request(app)
            .get("/api/pedidos")
            .set("Authorization", `Bearer ${userToken}`);

        await db.run("UPDATE usuarios SET activo = 1 WHERE email = ?", ["juan@viandas.com"]);
        expect(res.status).toBe(403);
    });

    it("rechaza ids, fechas, cantidades y campos desconocidos invalidos", async () => {
        const [idRes, bodyRes] = await Promise.all([
            request(app)
                .get("/api/pedidos/no-es-id")
                .set("Authorization", `Bearer ${adminToken}`),
            request(app)
                .post("/api/pedidos")
                .set("Authorization", `Bearer ${userToken}`)
                .send({
                    menuId: menuConcurrenteId,
                    fecha: "2030-02-30",
                    cantidad: 1.5,
                    turnoEntrega: "almuerzo",
                    puntoRetiroId: 1,
                    total: 1,
                }),
        ]);

        expect(idRes.status).toBe(400);
        expect(bodyRes.status).toBe(400);
        expect(bodyRes.body.error).toMatch(/fecha valida|numero entero|no esta permitido/i);
    });

    it("rechaza filtros invalidos", async () => {
        const res = await request(app).get("/api/menus?activo=2&fecha=2026-02-30");

        expect(res.status).toBe(400);
    });

    it("considera pedidos entregados al calcular cupo utilizado", async () => {
        const res = await request(app).get("/api/menus?fecha=2026-06-09&tipo=clasico");

        expect(res.status).toBe(200);
        expect(res.body[0].cupoDisponible).toBe(12);
    });

    it("serializa altas concurrentes y no supera el cupo", async () => {
        const payload = {
            menuId: menuConcurrenteId,
            fecha: "2030-01-01",
            cantidad: 1,
            turnoEntrega: "almuerzo",
            puntoRetiroId: 1,
        };

        const responses = await Promise.all([
            request(app).post("/api/pedidos").set("Authorization", `Bearer ${userToken}`).send(payload),
            request(app).post("/api/pedidos").set("Authorization", `Bearer ${userToken}`).send(payload),
        ]);

        expect(responses.map(res => res.status).sort()).toEqual([201, 400]);
        const db = await getDb();
        const { cantidad } = await db.get(
            "SELECT COALESCE(SUM(cantidad), 0) AS cantidad FROM pedidos WHERE menuId = ?",
            [menuConcurrenteId]
        );
        expect(cantidad).toBe(1);
    });
});
