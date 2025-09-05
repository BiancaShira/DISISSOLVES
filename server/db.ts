import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// PostgreSQL connection configuration
const connection = postgres(process.env.DATABASE_URL, {
  max: 10,
});

export const db = drizzle(connection, { schema });
