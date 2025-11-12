// ABOUTME: Database connection using Drizzle ORM with Supabase Transaction Pooling
// ABOUTME: Shared database connection used by all API routes with lazy initialization

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema.ts';
import { setDefaultResultOrder } from 'dns';

// Force IPv4 DNS resolution (Render doesn't support IPv6)
setDefaultResultOrder('ipv4first');

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

  // Create postgres client with Supabase Pooler configuration
  // Works with both Transaction (6543) and Session (5432) pooling
  const client = postgres(connectionString, {
    max: 10, // Connection pool size
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Connection timeout in seconds
    fetch_types: false, // Skip fetching types for performance
    prepare: false, // Disable prepared statements (required for Transaction pooling)
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
