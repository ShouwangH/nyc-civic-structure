# Data Backfill Tool - Quick Start

## What Was Built

A simple internal tool for updating placeholder data in the NYC civic structure visualization. Located in `/admin` directory.

**Key Features:**
- Password-protected access (2 editors)
- Edit node properties (label, type, branch, factoid)
- Update scope metadata
- Update process descriptions
- PostgreSQL database (Supabase)
- Audit logging
- Simple web interface

**What's NOT included:**
- No add/delete operations (structure is locked)
- No real-time updates (manual refresh)
- No user accounts (shared password)
- No complex validation

## Quick Setup (5 steps)

### 1. Install Admin Dependencies

```bash
cd admin
bun install
```

### 2. Create Supabase Database

1. Go to [supabase.com](https://supabase.com) and create a project
2. Get your connection string from Project Settings > Database
3. Copy `admin/.env.example` to `admin/.env`
4. Add your `DATABASE_URL` and `EDIT_PASSWORD`

### 3. Set Up Database Schema

```bash
cd admin
bun run db:generate
```

Then apply migrations via Supabase SQL Editor or run a migration script.

### 4. Seed Database from JSON Files

```bash
cd admin
bun run db:seed
```

This reads from `data/*.json` and populates the database.

### 5. Deploy to Vercel

Add environment variables to Vercel:
- `DATABASE_URL` (from Supabase)
- `EDIT_PASSWORD` (choose a strong password)

Deploy:
```bash
vercel --prod
```

Access the tool at: `yourapp.vercel.app/admin/`

## Using the Tool

1. Visit `/admin/`
2. Enter password
3. Search/browse nodes
4. Click to edit
5. Save changes

Changes are immediate and logged in the database.

## Architecture

```
/admin/
├── api/               # Vercel Functions (3 endpoints)
│   ├── nodes/[id].ts  # Update node
│   ├── scopes/[id].ts # Update scope
│   └── processes/[id].ts # Update process
├── drizzle/           # Database schema & migrations
│   ├── schema.ts      # Drizzle ORM schema
│   └── seed.ts        # Migration script
├── lib/               # Shared utilities
│   ├── db.ts          # Database connection
│   ├── auth.ts        # Bearer token auth
│   └── validation.ts  # Zod schemas
├── public/            # Simple frontend
│   ├── index.html     # Admin interface
│   └── app.js         # Frontend logic
└── package.json       # Admin dependencies
```

**Tech Stack:**
- Database: Supabase PostgreSQL
- ORM: Drizzle
- API: Vercel Functions
- Auth: Bearer token (simple password)
- Frontend: Vanilla HTML/JS (no framework needed)

## API Endpoints

All require `Authorization: Bearer [password]` header.

**List nodes:**
```
GET /admin/api/nodes
GET /admin/api/nodes?scope=city
```

**Update node:**
```
PUT /admin/api/nodes/[id]
Content-Type: application/json

{
  "label": "New Label",
  "type": "office",
  "branch": "Executive",
  "factoid": "Description"
}
```

## After Backfill is Complete

Options:
1. **Keep it**: Useful for future updates
2. **Remove it**: Delete `/admin` folder
3. **Archive it**: Keep in git, remove from deployment

To remove from deployment:
- Delete Vercel environment variables
- Remove `/admin` rewrite rules from `vercel.json`

## Troubleshooting

**Can't connect to database:**
- Check `DATABASE_URL` is set correctly
- Use the connection pooling URL from Supabase (not direct connection)
- Verify Supabase project is active

**Password not working:**
- Check `EDIT_PASSWORD` matches in both `.env` and Vercel
- No spaces before/after password
- Password is case-sensitive

**Seed script fails:**
- Verify JSON files exist in `data/` folder
- Check console for specific errors
- Ensure node IDs referenced in edges exist

## Development

**View database:**
```bash
cd admin
bun run db:studio
```

**Make schema changes:**
1. Edit `admin/drizzle/schema.ts`
2. Run `bun run db:generate`
3. Apply migration to database

## Security Notes

- Shared password (not individual accounts)
- HTTPS enforced by Vercel
- Audit log tracks all changes
- Read endpoints have no auth (internal tool)
- Write endpoints require Bearer token

---

For detailed documentation, see [admin/README.md](admin/README.md)
