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

        await db.run("PRAGMA foreign_keys = ON");
    }

    return db;
}
