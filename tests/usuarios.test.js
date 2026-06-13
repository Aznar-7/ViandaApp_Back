import request from "supertest";
import app from "../src/app.js";
import { closeDb, getDb } from "../src/database/db.js";

let adminToken;
let userToken;
let adminId;
let userId;
const createdUserIds = [];

beforeAll(async () => {
    const [adminRes, userRes] = await Promise.all([
        request(app).post("/api/auth/login").send({ email: "admin@viandas.com", password: "admin123" }),
        request(app).post("/api/auth/login").send({ email: "juan@viandas.com", password: "user123" }),
    ]);
    adminToken = adminRes.body.token;
    userToken = userRes.body.token;
    adminId = adminRes.body.usuario.id;
    userId = userRes.body.usuario.id;
});

afterAll(async () => {
    const db = await getDb();
    for (const id of createdUserIds) {
        await db.run("DELETE FROM usuarios WHERE id = ?", [id]);
    }
    await db.run(
        "UPDATE usuarios SET nombre = ?, email = ?, rol = 'usuario', activo = 1 WHERE id = ?",
        ["Juan Perez", "juan@viandas.com", userId]
    );
    await closeDb();
});

describe("Usuarios admin", () => {
    it("permite al admin crear un usuario con rol y estado inicial", async () => {
        const res = await request(app)
            .post("/api/usuarios")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({
                nombre: "Gestor Test",
                email: "gestor.test@viandas.com",
                password: "secreto123",
                rol: "admin",
                activo: 1,
            });

        expect(res.status).toBe(201);
        createdUserIds.push(res.body.id);
        expect(res.body).toEqual(expect.objectContaining({
            nombre: "Gestor Test",
            email: "gestor.test@viandas.com",
            rol: "admin",
            activo: 1,
        }));
        expect(res.body.passwordHash).toBeUndefined();
    });

    it("permite al admin listar usuarios sin exponer passwordHash", async () => {
        const res = await request(app)
            .get("/api/usuarios?rol=usuario&activo=1")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body.every(usuario => usuario.rol === "usuario" && usuario.activo === 1)).toBe(true);
        expect(res.body.every(usuario => usuario.passwordHash === undefined)).toBe(true);
    });

    it("permite al admin asignar roles y el cambio toma efecto inmediatamente", async () => {
        const editar = await request(app)
            .put(`/api/usuarios/${userId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ rol: "admin" });

        expect(editar.status).toBe(200);
        expect(editar.body.rol).toBe("admin");

        const accesoConTokenExistente = await request(app)
            .get("/api/usuarios")
            .set("Authorization", `Bearer ${userToken}`);
        expect(accesoConTokenExistente.status).toBe(200);

        await request(app)
            .put(`/api/usuarios/${userId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ rol: "usuario" });
    });

    it("impide que un usuario comun gestione usuarios", async () => {
        const res = await request(app)
            .get("/api/usuarios")
            .set("Authorization", `Bearer ${userToken}`);

        expect(res.status).toBe(403);
    });

    it("impide que el admin se quite su rol o se desactive", async () => {
        const [demote, deactivate] = await Promise.all([
            request(app)
                .put(`/api/usuarios/${adminId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ rol: "usuario" }),
            request(app)
                .put(`/api/usuarios/${adminId}`)
                .set("Authorization", `Bearer ${adminToken}`)
                .send({ activo: 0 }),
        ]);

        expect(demote.status).toBe(400);
        expect(deactivate.status).toBe(400);
    });

    it("permite al admin desactivar y activar otro usuario", async () => {
        const desactivar = await request(app)
            .patch(`/api/usuarios/${userId}/desactivar`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(desactivar.status).toBe(200);
        expect(desactivar.body.activo).toBe(0);

        const activar = await request(app)
            .patch(`/api/usuarios/${userId}/activar`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(activar.status).toBe(200);
        expect(activar.body.activo).toBe(1);
    });
});
