import request from "supertest";
import app from "../src/app.js";
import { closeDb, getDb } from "../src/database/db.js";

afterAll(async () => {
    await closeDb();
});

describe("Sedes", () => {
    it("lista publicamente las sedes activas", async () => {
        const res = await request(app).get("/api/sedes");

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(7);
        expect(res.body.every(sede => sede.activo === 1)).toBe(true);
        expect(res.body[0]).toEqual(expect.objectContaining({
            id: expect.any(Number),
            nombre: expect.any(String),
            direccion: expect.any(String),
        }));
    });

    it("permite filtrar sedes inactivas y valida el filtro", async () => {
        const db = await getDb();
        await db.run(
            "INSERT INTO sedes (nombre, direccion, activo) VALUES (?, ?, 0)",
            ["Sede inactiva test", "Direccion test"]
        );

        const [inactivas, invalido] = await Promise.all([
            request(app).get("/api/sedes?activo=0"),
            request(app).get("/api/sedes?activo=2"),
        ]);

        await db.run("DELETE FROM sedes WHERE nombre = ?", ["Sede inactiva test"]);

        expect(inactivas.status).toBe(200);
        expect(inactivas.body.some(sede => sede.nombre === "Sede inactiva test")).toBe(true);
        expect(invalido.status).toBe(400);
    });

    it("rechaza una sede inexistente al crear un pedido", async () => {
        const login = await request(app)
            .post("/api/auth/login")
            .send({ email: "juan@viandas.com", password: "user123" });

        const res = await request(app)
            .post("/api/pedidos")
            .set("Authorization", `Bearer ${login.body.token}`)
            .send({
                menuId: 5,
                fecha: "2026-06-11",
                cantidad: 1,
                turnoEntrega: "almuerzo",
                puntoRetiroId: 999999,
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/sede de retiro/i);
    });
});
