import { drizzle } from "drizzle-orm/d1";
import { schema } from "./schema";

/**
 * Build a Drizzle client from the request's D1 binding.
 * Do not cache the binding, and do not wrap it in a Proxy — D1 is per request.
 */
export function getDb(database: Env["DB"]) {
  return drizzle(database, { schema });
}

export type AppDatabase = ReturnType<typeof getDb>;
