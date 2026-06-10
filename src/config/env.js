import "dotenv/config";

export const PORT        = process.env.PORT        || 3000;
export const JWT_SECRET  = process.env.JWT_SECRET  || "your_jwt_secret_key";
export const DB_FILE     = process.env.DB_FILE     || "./data/database.sqlite";
export const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
