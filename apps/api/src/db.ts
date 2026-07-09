import { createDb, type Database } from "@yaas/db";
import { config } from "./config.js";

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    db = createDb(config.databaseUrl);
  }
  return db;
}
