# NYC Civic Structure - Data Backfill Tool

Internal tool for updating placeholder data in the NYC civic structure visualization.

## Purpose

This is **not a user-facing feature** but an internal data pipeline operation. It provides a simple interface for 2 editors to replace placeholder civic structure data with accurate information.

## Setup

### 1. Install Dependencies

```bash
cd admin
bun install
```

### 2. Set Up Supabase Database

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > Database
3. Copy the "Connection string" (use the connection pooling URL for serverless)
4. Create a `.env` file in the `admin` directory:

```bash
cp .env.example .env
```

5. Add your database URL and a secure password to `.env`:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
EDIT_PASSWORD=your-strong-password-here
```

### 3. Generate Database Schema

```bash
bun run db:generate
```

This creates migration files in `drizzle/migrations/` based on the schema.

### 4. Run Migrations

Apply the schema to your Supabase database:

```bash
# If you have a separate migrate script
bun run db:migrate

# OR run migrations via Drizzle Studio
bun run db:studio
```

### 5. Seed Database

Populate the database with data from JSON files:

```bash
bun run db:seed
```

This reads from the main project's `data/` folder and inserts all nodes, edges, processes, and subgraphs.

### 6. Deploy to Vercel

1. Add environment variables to Vercel:
   - `DATABASE_URL`
   - `EDIT_PASSWORD`

2. Deploy:

```bash
vercel --prod
```

The admin interface will be available at `yourapp.vercel.app/admin/`

## Usage

### Editing Nodes

1. Visit `/admin/` in your browser
2. Enter the password
3. Browse or search for nodes
4. Click a node to edit its:
   - Label
   - Type
   - Branch
   - Factoid (description)
5. Save changes

Changes are saved to the PostgreSQL database immediately and logged in the audit table.

### API Endpoints

All endpoints require `Authorization: Bearer [EDIT_PASSWORD]` header.

**List nodes:**
```bash
GET /admin/api/nodes
GET /admin/api/nodes?scope=city
```

**Update node:**
```bash
PUT /admin/api/nodes/[id]
Content-Type: application/json

{
  "label": "Updated Label",
  "type": "office",
  "branch": "Executive",
  "factoid": "New description"
}
```

**Update scope metadata:**
```bash
PUT /admin/api/scopes/[id]
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "New description"
}
```

**Update process:**
```bash
PUT /admin/api/processes/[id]
Content-Type: application/json

{
  "label": "Updated Process Name",
  "description": "New process description"
}
```

## Database Schema

- **scopes**: Federal, State, Regional, City
- **nodes**: Government entities (offices, bodies, agencies)
- **edges**: Relationships between entities
- **processes**: Workflow definitions
- **subgraphs**: Detailed entity views
- **audit_log**: Change tracking

## Development

**View database:**
```bash
bun run db:studio
```

Opens Drizzle Studio at `https://local.drizzle.studio`

**Generate new migration:**
```bash
# Edit drizzle/schema.ts
bun run db:generate
bun run db:migrate
```

## Cleanup

After backfilling is complete, you can:

1. **Keep it**: Leave the tool for occasional updates
2. **Remove it**: Delete the `/admin` folder entirely
3. **Archive it**: Remove from deployment but keep in git history

To remove from deployment:
1. Delete environment variables from Vercel
2. Remove `/admin` folder
3. Remove admin routes from `vercel.json`

## Security

- Password authentication (shared secret)
- Bearer token validation on all write endpoints
- Audit log tracks all changes
- Read operations require no auth
- HTTPS enforced by Vercel

## Troubleshooting

**"DATABASE_URL not set"**
- Check that environment variable exists in `.env` locally or Vercel dashboard for production

**"Invalid password"**
- Verify `EDIT_PASSWORD` matches between client and server
- Check for extra spaces or special characters

**"Connection error"**
- Verify Supabase database is running
- Check connection string is correct
- Ensure you're using the connection pooling URL for serverless functions

**Seed script fails**
- Ensure main project's JSON files exist in `data/` folder
- Check for data validation errors in console output
- Verify all referenced node IDs exist (no orphaned edges)

## Notes

- This is internal tooling, not a polished product
- No user accounts—shared password between 2 editors
- No real-time updates—manual refresh to see changes
- Minimal validation—assumes editors know the data structure
- Changes are immediate and irreversible (use audit log if needed)
