import "dotenv/config";

const NODE_ENV = process.env.NODE_ENV || "development";
const rawCorsOrigins = process.env.CORS_ORIGIN
    || (NODE_ENV === "production" ? "" : "http://localhost:5173");

if (!rawCorsOrigins) {
    throw new Error("CORS_ORIGIN es obligatorio en produccion");
}

function parseCorsOrigins(value) {
    return value.split(",").map(origin => {
        const normalized = origin.trim().replace(/\/$/, "");
        const url = new URL(normalized);

        if (!["http:", "https:"].includes(url.protocol) || url.origin !== normalized) {
            throw new Error(`CORS_ORIGIN invalido: ${origin}`);
        }

        return normalized;
    });
}

export const PORT        = process.env.PORT        || 3000;
export const JWT_SECRET  = process.env.JWT_SECRET;
export const DB_FILE     = process.env.DB_FILE     || "./data/database.sqlite";
export const CORS_ORIGINS = parseCorsOrigins(rawCorsOrigins);
export const BUSINESS_TIME_ZONE = process.env.BUSINESS_TIME_ZONE || "America/Argentina/Buenos_Aires";
export const JWT_ISSUER = process.env.JWT_ISSUER || "viandas-api";
export const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "viandas-frontend";
export const TRUST_PROXY_HOPS = Number(process.env.TRUST_PROXY_HOPS ?? (NODE_ENV === "production" ? 1 : 0));
export const SEED_ON_START = process.env.SEED_ON_START === "true";
export const SYNC_MENUS_ON_START = process.env.SYNC_MENUS_ON_START !== "false";

if (!Number.isInteger(TRUST_PROXY_HOPS) || TRUST_PROXY_HOPS < 0) {
    throw new Error("TRUST_PROXY_HOPS debe ser un numero entero mayor o igual a 0");
}
