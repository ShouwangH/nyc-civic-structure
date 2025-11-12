// ABOUTME: Database connection using Drizzle ORM with Supabase Direct Connection
// ABOUTME: Shared database connection used by all API routes with lazy initialization

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema.ts';

let _db: PostgresJsDatabase<typeof schema> | null = null;

function getDb() {
  if (_db) return _db;

  let connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Force IPv4 by adding ssl and connection parameters if not present
  if (!connectionString.includes('?')) {
    connectionString += '?sslmode=require';
  } else if (!connectionString.includes('sslmode')) {
    connectionString += '&sslmode=require';
  }

  // Create postgres client with Direct Connection configuration
  // Optimized for long-running server (not serverless)
  const client = postgres(connectionString, {
    max: 10, // Connection pool size (Direct connection supports up to 60)
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Connection timeout in seconds
    fetch_types: false, // Skip fetching types for performance
    prepare: false, // Disable prepared statements for compatibility
    ssl: 'require', // Force SSL for Supabase
    connection: {
      application_name: 'nyc-civic-app',
    },
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
