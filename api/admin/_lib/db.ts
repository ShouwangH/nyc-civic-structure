// ABOUTME: Database connection utility using Drizzle ORM and Postgres.js
// ABOUTME: Creates connection pool for Supabase PostgreSQL

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../_drizzle/schema';

// Connection string from environment
const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create postgres client with serverless optimization
const client = postgres(connectionString, { max: 1 });

// Create drizzle instance
export const db = drizzle(client, { schema });
