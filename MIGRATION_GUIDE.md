# Database Migration Guide

This guide explains how to set up and migrate your Supabase database for the NYC Civic Structure project.

## Prerequisites

1. **Supabase Project**: Create a project at [supabase.com](https://supabase.com)
2. **Node/Bun**: Ensure you have Bun 1.3.0+ or Node.js 18+ installed
3. **Dependencies**: Run `bun install` to install all dependencies including `drizzle-kit`

## Step 1: Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update the `DATABASE_URL` with your Supabase Direct Connection string:

```env
# Get this from Supabase Dashboard → Settings → Database → Connection String (Direct)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

**Important**: Use the **Direct Connection** URL, not the Transaction Pooler or Session Pooler.

Format breakdown:
- `postgresql://` - PostgreSQL protocol
- `postgres` - Default user
- `[YOUR-PASSWORD]` - Your database password
- `[YOUR-PROJECT-REF].supabase.co` - Your project host
- `5432` - PostgreSQL port (direct connection)
- `postgres` - Database name

## Step 2: Generate Migration Files

The schema is defined in `/server/lib/schema.ts`. To generate SQL migration files:

```bash
bun run db:generate
```

This creates migration SQL files in `/server/migrations/` based on the schema.

## Step 3: Push Schema to Database

There are two ways to apply the schema:

### Option A: Push Schema Directly (Recommended for Development)

This pushes the schema directly without generating migration files:

```bash
bun run db:push
```

This is the fastest way to sync your local schema to Supabase.

### Option B: Run Migration Files (Recommended for Production)

If you generated migration files (Step 2), apply them:

```bash
bun run db:migrate
```

This runs all pending migrations in `/server/migrations/`.

## Step 4: Verify Migration

You can inspect your database using Drizzle Studio:

```bash
bun run db:studio
```

This opens a web UI at `http://localhost:4983` where you can browse tables and data.

## Database Schema Overview

The migration creates the following table groups:

### Civic Structure Tables (Existing)
- `scopes` - Government scopes (federal, state, city)
- `nodes` - Government entities
- `edges` - Relationships between entities
- `processes` - Workflow definitions
- `subgraphs` - Detailed views
- `overlays` - Visualization anchors
- `audit_log` - Change tracking

### Housing Data Tables (New)
- `housing_buildings` - Processed housing data with all transformations
  - Includes completion dates, unit counts, affordability, location
  - Indexed on: completion year, borough, BBL, data source, building type
- `housing_demolitions` - Demolition records for net housing calculations
  - Includes estimated units demolished, BBL matching
  - Indexed on: demolition year, BBL, borough

### Capital Budget Tables (New)
- `capital_projects` - NYC capital budget projects with GeoJSON
  - Includes project details, budget allocations, fiscal timeline
  - Stores geometry as JSONB for GeoJSON compatibility
  - Indexed on: fiscal year, managing agency, type category, completion year

### Financial Visualization Tables (New)
- `sankey_datasets` - Sankey diagram data (budget flows, pension allocations)
  - Stores nodes and links in d3-sankey compatible format
  - Indexed on: fiscal year, data type
- `sunburst_datasets` - Sunburst diagram data (revenue, expense breakdowns)
  - Stores hierarchical tree in d3-hierarchy compatible format
  - Indexed on: fiscal year, data type

## Seeding Data

After migration, populate the database using seed scripts:

```bash
# Seed housing data (fetches from NYC Open Data, processes, stores)
bun run seed:housing

# Seed capital budget data
bun run seed:capital

# Seed financial visualizations (budget, revenue, expense, pension)
bun run seed:financial

# Or seed everything at once
bun run seed:all
```

**Note**: Seeding will take several minutes as it fetches large datasets from NYC Open Data APIs.

## Troubleshooting

### Error: "DATABASE_URL environment variable is not set"

Make sure you created `.env` file with valid `DATABASE_URL`.

### Error: "password authentication failed"

Check your password in the `DATABASE_URL`. Get the correct password from Supabase Dashboard → Settings → Database.

### Error: "connection timeout"

- Verify your Supabase project is not paused (free tier pauses after 7 days of inactivity)
- Check if you're using the correct connection string (Direct, not Pooler)
- Ensure you're not behind a firewall blocking port 5432

### Migration conflicts

If you need to reset the database:

1. Drop all tables in Supabase Dashboard → Database → Tables
2. Run `bun run db:push` again

## Connection Pooling Configuration

The database connection is configured for long-running servers (not serverless):

```typescript
// /server/lib/db.ts
const client = postgres(connectionString, {
  max: 10, // Connection pool size (Direct supports up to 60)
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
});
```

These settings are optimized for:
- Vite dev server (single long-running process)
- Production deployment (single server instance)
- Large dataset queries (housing, capital budget with geospatial data)

## Next Steps

After migration and seeding:

1. Start the development server: `bun run dev`
2. Verify data loads from database (not NYC Open Data API)
3. Check all visualizations render correctly

## Manual Migration (Advanced)

If you prefer to run SQL manually:

1. Generate migrations: `bun run db:generate`
2. Copy SQL from `/server/migrations/*.sql`
3. Execute in Supabase SQL Editor

## Switching from Pooler to Direct Connection

If you were previously using Transaction Pooler (`port 6543`) or Session Pooler:

**Old (Transaction Pooler)**:
```
postgresql://postgres:[PASSWORD]@[PROJECT-REF].pooler.supabase.com:6543/postgres
```

**New (Direct Connection)**:
```
postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres
```

Benefits of Direct Connection:
- Full PostgreSQL feature support
- Better for large data transfers (housing, capital budget)
- Supports prepared statements (required by Drizzle)
- Optimal for long-running connections
