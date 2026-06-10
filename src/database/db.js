import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import fs from "fs";
import { DB_FILE } from "../config/env.js";

let db = null;

export async function getDb() {
    if (!db) {
        fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
        db = await open({
            filename: DB_FILE,
            driver: sqlite3.Database,
        });

        await db.run("PRAGMA journal_mode = WAL");
        await db.run("PRAGMA foreign_keys = ON");
    }

    return db;
}

export async function closeDb() {
    if (db) {
        await db.close();
        db = null;
    }
}

export async function withTransaction(fn) {
    const db = await getDb();
    await db.run("BEGIN IMMEDIATE");
    try {
        const result = await fn(db);
        await db.run("COMMIT");
        return result;
    } catch (err) {
        await db.run("ROLLBACK").catch(() => {});
        throw err;
    }
}
