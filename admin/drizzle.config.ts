// ABOUTME: Drizzle Kit configuration for database migrations and introspection
// ABOUTME: Connects to Supabase PostgreSQL using DATABASE_URL environment variable

import type { Config } from 'drizzle-kit';

export default {
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect:'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  }
} satisfies Config;
