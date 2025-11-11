// ABOUTME: Database connection using Drizzle ORM with Supabase Direct Connection
// ABOUTME: Shared database connection used by all API routes with lazy initialization

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

let _db: PostgresJsDatabase<typeof schema> | null = null;

function getDb() {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Create postgres client with Direct Connection configuration
  // Optimized for long-running server (not serverless)
  const client = postgres(connectionString, {
    max: 10, // Connection pool size (Direct connection supports up to 60)
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Connection timeout in seconds
  });

  _db = drizzle(client, { schema });
  return _db;
}

// Export lazy-initialized database connection
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  }
});
