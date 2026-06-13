import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { runMigrations } from "../src/database/migrations.js";

const dbFile = path.resolve("data/migration-test.sqlite");

afterAll(() => {
    for (const suffix of ["", "-shm", "-wal"]) {
        fs.rmSync(`${dbFile}${suffix}`, { force: true });
    }
});

describe("Migraciones", () => {
    it("elimina puntoRetiro NOT NULL de una tabla legacy sin perder datos", async () => {
        const db = await open({ filename: dbFile, driver: sqlite3.Database });
        await db.exec(`
            PRAGMA foreign_keys = ON;

            CREATE TABLE usuarios (id INTEGER PRIMARY KEY);
            CREATE TABLE menus (id INTEGER PRIMARY KEY);
            CREATE TABLE pedidos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                menuId INTEGER NOT NULL,
                usuarioId INTEGER NOT NULL,
                fecha TEXT NOT NULL,
                cantidad INTEGER NOT NULL,
                turnoEntrega TEXT NOT NULL,
                puntoRetiro TEXT NOT NULL,
                total REAL NOT NULL,
                estado TEXT NOT NULL,
                observaciones TEXT
            );
            CREATE TABLE historial_pedidos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pedidoId INTEGER NOT NULL,
                usuarioId INTEGER NOT NULL,
                accion TEXT NOT NULL,
                fechaHora TEXT NOT NULL,
                valorAnterior TEXT,
                valorNuevo TEXT,
                FOREIGN KEY (pedidoId) REFERENCES pedidos(id)
            );

            INSERT INTO usuarios (id) VALUES (1);
            INSERT INTO menus (id) VALUES (1);
            INSERT INTO pedidos (
                menuId, usuarioId, fecha, cantidad, turnoEntrega,
                puntoRetiro, total, estado
            ) VALUES (1, 1, '2030-01-01', 1, 'almuerzo', 'Sede legacy', 100, 'pendiente');
        `);

        await runMigrations(db);

        const columns = await db.all("PRAGMA table_info(pedidos)");
        expect(columns.some(column => column.name === "puntoRetiro")).toBe(false);
        expect(columns.find(column => column.name === "puntoRetiroId")?.notnull).toBe(1);

        const sede = await db.get("SELECT id FROM sedes WHERE nombre = 'Sede legacy'");
        await expect(db.run(
            `INSERT INTO pedidos (
                menuId, usuarioId, fecha, cantidad, turnoEntrega,
                puntoRetiroId, total, estado
             ) VALUES (1, 1, '2030-01-02', 1, 'cena', ?, 100, 'pendiente')`,
            [sede.id]
        )).resolves.toBeDefined();

        expect((await db.get("SELECT COUNT(*) AS total FROM pedidos")).total).toBe(2);
        await db.close();
    });
});
