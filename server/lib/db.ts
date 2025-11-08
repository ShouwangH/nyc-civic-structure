// ABOUTME: Database connection for server API routes
// ABOUTME: Uses Drizzle ORM with PostgreSQL (Supabase)

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../api/admin/_drizzle/schema';

let _db: PostgresJsDatabase<typeof schema> | null = null;

function getDb() {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const client = postgres(connectionString);
  _db = drizzle(client, { schema });
  return _db;
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  }
});
