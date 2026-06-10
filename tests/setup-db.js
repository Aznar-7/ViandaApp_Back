import { initDb } from "../src/database/initDb.js";
import { seedDb } from "../src/database/seedDb.js";

beforeAll(async () => {
    await initDb();
    await seedDb();
});
