// ABOUTME: Drizzle ORM configuration for database migrations and schema management
// ABOUTME: Configured for Supabase PostgreSQL with direct connection

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './server/lib/schema.ts',
  out: './server/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
