import request from "supertest";
import app from "../src/app.js";
import { closeDb } from "../src/database/db.js";

afterAll(async () => {
    await closeDb();
});

describe("Auth", () => {
    // Test 1
    it("login correcto → 200 con token y usuario sin passwordHash", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "admin@viandas.com", password: "admin123" });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.usuario.rol).toBe("admin");
        expect(res.body.usuario.passwordHash).toBeUndefined();
    });

    // Test 2
    it("login inválido (password incorrecta) → 401", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "admin@viandas.com", password: "contrasenia_mal" });

        expect(res.status).toBe(401);
        expect(res.body.error).toBeDefined();
    });
});
