import request from "supertest";
import app from "../src/app.js";
import { getDb, closeDb } from "../src/database/db.js";

let adminToken;
let userToken;
let pedidoExistente;      // cualquier pedido (para test detalle)
let pedidoEditable;       // pendiente o confirmado con cupo conocido (para test cupo)
let pedidoEntregado;      // entregado (para test edición inválida)

beforeAll(async () => {
    const [adminRes, userRes] = await Promise.all([
        request(app).post("/api/auth/login").send({ email: "admin@viandas.com", password: "admin123" }),
        request(app).post("/api/auth/login").send({ email: "juan@viandas.com",  password: "user123"  }),
    ]);
    adminToken = adminRes.body.token;
    userToken  = userRes.body.token;

    const db = await getDb();

    // Auto-cleanup: elimina pedidos de test de runs anteriores que crashearon antes de afterAll
    const leftovers = await db.all("SELECT id FROM pedidos WHERE observaciones = 'pedido-test'");
    for (const { id } of leftovers) {
        await db.run("DELETE FROM historial_pedidos WHERE pedidoId = ?", [id]);
        await db.run("DELETE FROM pedidos WHERE id = ?", [id]);
    }

    [pedidoExistente, pedidoEditable, pedidoEntregado] = await Promise.all([
        db.get("SELECT id FROM pedidos LIMIT 1"),
        db.get("SELECT p.*, m.cupoDiario FROM pedidos p JOIN menus m ON m.id = p.menuId WHERE p.estado IN ('pendiente','confirmado') LIMIT 1"),
        db.get("SELECT id FROM pedidos WHERE estado = 'entregado' LIMIT 1"),
    ]);
});

afterAll(async () => {
    const db = await getDb();
    const testPedidos = await db.all("SELECT id FROM pedidos WHERE observaciones = 'pedido-test'");
    for (const { id } of testPedidos) {
        await db.run("DELETE FROM historial_pedidos WHERE pedidoId = ?", [id]);
        await db.run("DELETE FROM pedidos WHERE id = ?", [id]);
    }
    await closeDb();
});

describe("Pedidos", () => {
    it("listado sin filtros devuelve solo pedidos propios para usuario", async () => {
        const res = await request(app)
            .get("/api/pedidos?limit=100")
            .set("Authorization", `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.pedidos.length).toBeGreaterThan(0);
        expect(res.body.pedidos.every(pedido => pedido.usuarioId === 2)).toBe(true);
    });

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

    it("combina filtros por fecha, estado, menuId y tipo", async () => {
        const res = await request(app)
            .get("/api/pedidos?fecha=2026-06-09&estado=pendiente&menuId=2&tipo=vegetariano")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(1);
        expect(res.body.pedidos[0]).toEqual(expect.objectContaining({
            fecha: "2026-06-09",
            estado: "pendiente",
            menuId: 2,
        }));
    });

    it("pagina y ordena ascendente o descendente con sortBy y order", async () => {
        const [asc, desc] = await Promise.all([
            request(app)
                .get("/api/pedidos?sortBy=total&order=asc&page=1&limit=100")
                .set("Authorization", `Bearer ${adminToken}`),
            request(app)
                .get("/api/pedidos?sortBy=total&order=desc&page=1&limit=100")
                .set("Authorization", `Bearer ${adminToken}`),
        ]);

        expect(asc.status).toBe(200);
        expect(desc.status).toBe(200);
        expect(asc.body.sortBy).toBe("total");
        expect(asc.body.order).toBe("asc");
        expect(asc.body.pedidos.every((pedido, index, items) => index === 0 || items[index - 1].total <= pedido.total)).toBe(true);
        expect(desc.body.pedidos.every((pedido, index, items) => index === 0 || items[index - 1].total >= pedido.total)).toBe(true);
    });

    // Test 4
    it("detalle de pedido existente → 200 con el objeto", async () => {
        const res = await request(app)
            .get(`/api/pedidos/${pedidoExistente.id}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(pedidoExistente.id);
        expect(res.body.menuNombre).toBeDefined();
        expect(res.body.puntoRetiroNombre).toBeDefined();
        expect(res.body.puntoRetiroDireccion).toBeDefined();
    });

    // Test 5
    it("detalle de pedido inexistente → 404", async () => {
        const res = await request(app)
            .get("/api/pedidos/9999999")
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
                puntoRetiroId: 1,
                observaciones: "pedido-test",
            });

        expect(res.status).toBe(201);
        expect(res.body.estado).toBe("pendiente");
        expect(res.body.total).toBe(800);
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
                puntoRetiroId: 1,
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
                puntoRetiroId: 1,
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/cupo insuficiente/i);
    });

    it("distingue menu inexistente, inactivo y fecha no disponible", async () => {
        const db = await getDb();
        await db.run("UPDATE menus SET activo = 0 WHERE id = 5");

        try {
            const payload = {
                fecha: "2026-06-11",
                cantidad: 1,
                turnoEntrega: "almuerzo",
                puntoRetiroId: 1,
            };
            const [inexistente, inactivo, fechaIncorrecta] = await Promise.all([
                request(app)
                    .post("/api/pedidos")
                    .set("Authorization", `Bearer ${userToken}`)
                    .send({ ...payload, menuId: 999999 }),
                request(app)
                    .post("/api/pedidos")
                    .set("Authorization", `Bearer ${userToken}`)
                    .send({ ...payload, menuId: 5 }),
                request(app)
                    .post("/api/pedidos")
                    .set("Authorization", `Bearer ${userToken}`)
                    .send({ ...payload, menuId: 6, fecha: "2026-06-12" }),
            ]);

            expect(inexistente.status).toBe(404);
            expect(inexistente.body.error).toMatch(/menu no encontrado/i);
            expect(inactivo.status).toBe(400);
            expect(inactivo.body.error).toMatch(/menu no esta activo/i);
            expect(fechaIncorrecta.status).toBe(400);
            expect(fechaIncorrecta.body.error).toMatch(/no esta disponible para esa fecha/i);
        } finally {
            await db.run("UPDATE menus SET activo = 1 WHERE id = 5");
        }
    });

    // Test 9
    it("acceso a ruta protegida sin JWT → 401", async () => {
        const res = await request(app).get("/api/pedidos");
        expect(res.status).toBe(401);
    });

    // Test 10
    it("confirmar pedido como usuario (no admin) → 403", async () => {
        const res = await request(app)
            .patch(`/api/pedidos/${pedidoEditable.id}/confirmar`)
            .set("Authorization", `Bearer ${userToken}`);

        expect(res.status).toBe(403);
    });

    // Test 11
    it("edición que supera cupo → 400", async () => {
        // Pedimos más que el cupoDiario completo del menú → siempre falla
        const res = await request(app)
            .put(`/api/pedidos/${pedidoEditable.id}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ cantidad: pedidoEditable.cupoDiario + 1000 });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/cupo insuficiente/i);
    });

    // Test 12
    it("edición de pedido entregado → 400", async () => {
        const res = await request(app)
            .put(`/api/pedidos/${pedidoEntregado.id}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ observaciones: "intento de edicion" });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/solo se pueden editar pedidos pendientes o confirmados/i);
    });

    it("permite cambiar de menu y recalcula cupo, total e historial", async () => {
        const crear = await request(app)
            .post("/api/pedidos")
            .set("Authorization", `Bearer ${userToken}`)
            .send({
                menuId: 5,
                fecha: "2026-06-11",
                cantidad: 1,
                turnoEntrega: "almuerzo",
                puntoRetiroId: 1,
                observaciones: "pedido-cambio-menu-test",
            });
        expect(crear.status).toBe(201);

        try {
            const editar = await request(app)
                .put(`/api/pedidos/${crear.body.id}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({ menuId: 6, cantidad: 2 });

            expect(editar.status).toBe(200);
            expect(editar.body.menuId).toBe(6);
            expect(editar.body.total).toBe(1900);

            const historial = await request(app)
                .get(`/api/pedidos/${crear.body.id}/historial`)
                .set("Authorization", `Bearer ${userToken}`);

            expect(historial.status).toBe(200);
            expect(historial.body.at(-1).accion).toBe("edicion");
            expect(historial.body.at(-1).valorAnterior.menuId).toBe(5);
            expect(historial.body.at(-1).valorNuevo.menuId).toBe(6);
        } finally {
            const db = await getDb();
            await db.run("DELETE FROM historial_pedidos WHERE pedidoId = ?", [crear.body.id]);
            await db.run("DELETE FROM pedidos WHERE id = ?", [crear.body.id]);
        }
    });

    it("rechaza cambiar de menu cuando el destino no tiene cupo", async () => {
        const db = await getDb();
        const { lastID: menuDestinoId } = await db.run(
            `INSERT INTO menus (nombre, descripcion, fecha, tipo, precio, cupoDiario, activo)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ["Menu destino sin cupo test", "Test cambio de menu", "2026-06-11", "clasico", 500, 1, 1]
        );
        const crear = await request(app)
            .post("/api/pedidos")
            .set("Authorization", `Bearer ${userToken}`)
            .send({
                menuId: 5,
                fecha: "2026-06-11",
                cantidad: 2,
                turnoEntrega: "almuerzo",
                puntoRetiroId: 1,
                observaciones: "pedido-cambio-sin-cupo-test",
            });
        expect(crear.status).toBe(201);

        try {
            const editar = await request(app)
                .put(`/api/pedidos/${crear.body.id}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send({ menuId: menuDestinoId });

            expect(editar.status).toBe(400);
            expect(editar.body.error).toMatch(/cupo insuficiente/i);
        } finally {
            await db.run("DELETE FROM historial_pedidos WHERE pedidoId = ?", [crear.body.id]);
            await db.run("DELETE FROM pedidos WHERE id = ?", [crear.body.id]);
            await db.run("DELETE FROM menus WHERE id = ?", [menuDestinoId]);
        }
    });

    it("devuelve el resumen administrativo obligatorio y conserva extras", async () => {
        const res = await request(app)
            .get("/api/pedidos/resumen")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.porEstado)).toBe(true);
        expect(Array.isArray(res.body.pedidosPorFecha)).toBe(true);
        expect(Array.isArray(res.body.pedidosPendientesPorFecha)).toBe(true);
        expect(Array.isArray(res.body.cuposRestantesPorMenu)).toBe(true);
        expect(Array.isArray(res.body.pedidosPendientesEntrega)).toBe(true);
        expect(typeof res.body.importeEstimadoConfirmados).toBe("number");
        expect(typeof res.body.recaudado).toBe("number");
        expect(res.body).toHaveProperty("menuDelDia");

        const db = await getDb();
        const confirmado = await db.get(
            "SELECT COALESCE(SUM(total), 0) AS total FROM pedidos WHERE estado = 'confirmado'"
        );
        expect(res.body.importeEstimadoConfirmados).toBe(confirmado.total);
    });

    it("protege el resumen administrativo para rol admin", async () => {
        const res = await request(app)
            .get("/api/pedidos/resumen")
            .set("Authorization", `Bearer ${userToken}`);

        expect(res.status).toBe(403);
    });
});
