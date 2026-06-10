import request from "supertest";
import app from "../src/app.js";
import { closeDb, getDb } from "../src/database/db.js";

afterAll(async () => {
    await closeDb();
});

describe("Menus", () => {
    it("incluye imagenUrl en el contrato de listado", async () => {
        const db = await getDb();
        await db.run(
            "UPDATE menus SET imagenUrl = ? WHERE id = (SELECT id FROM menus ORDER BY id LIMIT 1)",
            ["/assets/mondongo.jpg"]
        );

        const res = await request(app).get("/api/menus");

        expect(res.status).toBe(200);
        expect(res.body.some(menu => menu.imagenUrl === "/assets/mondongo.jpg")).toBe(true);
    });

    it("sirve las imagenes asociadas con cache y acceso cross-origin", async () => {
        const res = await request(app).get("/assets/mondongo.jpg");

        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toMatch(/^image\/jpeg/);
        expect(res.headers["cache-control"]).toContain("max-age=");
        expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    });
});
