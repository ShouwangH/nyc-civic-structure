// ABOUTME: Database connection for server API routes
// ABOUTME: Uses Drizzle ORM with PostgreSQL (Supabase)

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../shared/db/schema';

// Get DATABASE_URL from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create postgres client
const client = postgres(connectionString);

// Create drizzle instance
export const db = drizzle(client, { schema });
