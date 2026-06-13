import request from "supertest";
import app from "../src/app.js";
import { closeDb, getDb } from "../src/database/db.js";

let adminToken;
let userToken;
const createdMenuIds = [];

beforeAll(async () => {
    const [adminRes, userRes] = await Promise.all([
        request(app).post("/api/auth/login").send({ email: "admin@viandas.com", password: "admin123" }),
        request(app).post("/api/auth/login").send({ email: "juan@viandas.com", password: "user123" }),
    ]);
    adminToken = adminRes.body.token;
    userToken = userRes.body.token;
});

afterAll(async () => {
    const db = await getDb();
    for (const id of createdMenuIds) {
        await db.run("DELETE FROM menus WHERE id = ?", [id]);
    }
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

    it("permite que un admin cree un menu con todos sus datos", async () => {
        const payload = {
            nombre: "Menu creado por admin",
            descripcion: "Menu completo para probar el alta administrativa",
            fecha: "2030-02-15",
            tipo: "sin_tacc",
            precio: 2750.5,
            cupoDiario: 30,
            activo: 1,
            imagenUrl: "/assets/pollo_al_horno.jpg",
        };

        const res = await request(app)
            .post("/api/menus")
            .set("Authorization", `Bearer ${adminToken}`)
            .send(payload);

        expect(res.status).toBe(201);
        createdMenuIds.push(res.body.id);
        expect(res.body).toEqual(expect.objectContaining({
            ...payload,
            id: expect.any(Number),
            cupoDisponible: 30,
        }));
    });

    it("rechaza el alta de menu para un usuario que no es admin", async () => {
        const res = await request(app)
            .post("/api/menus")
            .set("Authorization", `Bearer ${userToken}`)
            .send({
                nombre: "Menu no autorizado",
                descripcion: "No debe insertarse",
                fecha: "2030-02-15",
                tipo: "clasico",
                precio: 1000,
                cupoDiario: 10,
                activo: 1,
            });

        expect(res.status).toBe(403);
    });

    it("requiere autenticacion para crear un menu", async () => {
        const res = await request(app).post("/api/menus").send({});

        expect(res.status).toBe(401);
    });

    it("valida todos los datos enviados al crear un menu", async () => {
        const res = await request(app)
            .post("/api/menus")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                nombre: "X",
                descripcion: "Invalido",
                fecha: "2030-02-30",
                tipo: "otro",
                precio: 0,
                cupoDiario: 1.5,
                activo: 2,
                total: 100,
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/nombre|fecha|tipo|precio|cupoDiario|activo|no esta permitido/i);
    });

    it("permite al admin editar y desactivar un menu", async () => {
        const crear = await request(app)
            .post("/api/menus")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                nombre: "Menu para editar",
                descripcion: "Descripcion inicial",
                fecha: "2030-03-10",
                tipo: "clasico",
                precio: 2000,
                cupoDiario: 20,
                activo: 1,
            });
        expect(crear.status).toBe(201);
        createdMenuIds.push(crear.body.id);

        const editar = await request(app)
            .put(`/api/menus/${crear.body.id}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ nombre: "Menu editado", precio: 2300 });
        expect(editar.status).toBe(200);
        expect(editar.body.nombre).toBe("Menu editado");
        expect(editar.body.precio).toBe(2300);

        const desactivar = await request(app)
            .patch(`/api/menus/${crear.body.id}/desactivar`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(desactivar.status).toBe(200);
        expect(desactivar.body.activo).toBe(0);
    });

    it("impide que un usuario comun edite menus", async () => {
        const res = await request(app)
            .put("/api/menus/1")
            .set("Authorization", `Bearer ${userToken}`)
            .send({ precio: 1 });

        expect(res.status).toBe(403);
    });

    it("impide reducir el cupo por debajo de lo reservado", async () => {
        const res = await request(app)
            .put("/api/menus/1")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ cupoDiario: 1 });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/cupo ya reservado/i);
    });

    it("impide cambiar la fecha de un menu que ya tiene pedidos", async () => {
        const res = await request(app)
            .put("/api/menus/1")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ fecha: "2030-01-01" });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/ya tiene pedidos/i);
    });
});
