import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

// Продакшн база данных - используется для Telegram бота в продакшене
const PRODUCTION_DATABASE_URL = process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL;

if (!PRODUCTION_DATABASE_URL) {
  throw new Error("PRODUCTION_DATABASE_URL or DATABASE_URL is not set");
}

const sql = neon(PRODUCTION_DATABASE_URL);
export const prodDb = drizzle(sql, { schema });

// Флаг для определения какую базу использовать
export const useProductionDb = () => {
  return process.env.NODE_ENV === 'production' || process.env.USE_PRODUCTION_DB === 'true';
};