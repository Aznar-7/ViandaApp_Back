import request from "supertest";
import app from "../src/app.js";
import { getDb, closeDb } from "../src/database/db.js";

let adminToken;
let userToken;

beforeAll(async () => {
    const adminRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@viandas.com", password: "admin123" });
    adminToken = adminRes.body.token;

    const userRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "juan@viandas.com", password: "user123" });
    userToken = userRes.body.token;
});

afterAll(async () => {
    // Eliminar pedidos creados por los tests para que sean repetibles
    const db = await getDb();
    const testPedidos = await db.all("SELECT id FROM pedidos WHERE puntoRetiro = 'Sede test'");
    for (const { id } of testPedidos) {
        await db.run("DELETE FROM historial_pedidos WHERE pedidoId = ?", [id]);
        await db.run("DELETE FROM pedidos WHERE id = ?", [id]);
    }
    await closeDb();
});

describe("Pedidos", () => {
    // Test 3
    it("listado con filtro de estado → 200 y todos los items con ese estado", async () => {
        const res = await request(app)
            .get("/api/pedidos?estado=pendiente")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.pedidos)).toBe(true);
        expect(res.body.pedidos.length).toBeGreaterThan(0);
        expect(res.body.pedidos.every(p => p.estado === "pendiente")).toBe(true);
    });

    // Test 4
    it("detalle de pedido existente → 200 con el objeto", async () => {
        const res = await request(app)
            .get("/api/pedidos/1")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(1);
        expect(res.body.menuNombre).toBeDefined();
    });

    // Test 5
    it("detalle de pedido inexistente → 404", async () => {
        const res = await request(app)
            .get("/api/pedidos/9999")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(404);
    });

    // Test 6
    it("alta válida → 201, estado pendiente, total calculado en backend", async () => {
        const res = await request(app)
            .post("/api/pedidos")
            .set("Authorization", `Bearer ${userToken}`)
            .send({
                menuId:       5,
                fecha:        "2026-06-11",
                cantidad:     1,
                turnoEntrega: "almuerzo",
                puntoRetiro:  "Sede test",
            });

        expect(res.status).toBe(201);
        expect(res.body.estado).toBe("pendiente");
        expect(res.body.total).toBe(800); // precio 800 × cantidad 1
    });

    // Test 7
    it("alta inválida — cantidad <= 0 → 400", async () => {
        const res = await request(app)
            .post("/api/pedidos")
            .set("Authorization", `Bearer ${userToken}`)
            .send({
                menuId:       5,
                fecha:        "2026-06-11",
                cantidad:     0,
                turnoEntrega: "almuerzo",
                puntoRetiro:  "Sede test",
            });

        expect(res.status).toBe(400);
    });

    // Test 8
    it("alta inválida — sin cupo → 400 con mensaje específico", async () => {
        const res = await request(app)
            .post("/api/pedidos")
            .set("Authorization", `Bearer ${userToken}`)
            .send({
                menuId:       6,
                fecha:        "2026-06-11",
                cantidad:     100,
                turnoEntrega: "almuerzo",
                puntoRetiro:  "Sede test",
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/cupo insuficiente/i);
    });

    // Test 9
    it("acceso a ruta protegida sin JWT → 401", async () => {
        const res = await request(app).get("/api/pedidos");

        expect(res.status).toBe(401);
    });

    // Test 10
    it("confirmar pedido como usuario (no admin) → 403", async () => {
        const res = await request(app)
            .patch("/api/pedidos/3/confirmar")
            .set("Authorization", `Bearer ${userToken}`);

        expect(res.status).toBe(403);
    });

    // Test 11
    it("edición que supera cupo → 400", async () => {
        // Pedido 1: menuId:1 (cupoDiario:15). Excluyendo pedido 1,
        // solo pedido 2 (entregado) no cuenta → cupoDisponible = 15.
        // Pedir cantidad:100 debe fallar.
        const res = await request(app)
            .put("/api/pedidos/1")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ cantidad: 100 });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/cupo insuficiente/i);
    });

    // Test 12
    it("edición de pedido entregado → 400", async () => {
        // Pedido 2 está en estado 'entregado' desde el seed
        const res = await request(app)
            .put("/api/pedidos/2")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ observaciones: "intento de edicion" });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/solo se pueden editar pedidos pendientes o confirmados/i);
    });
});
