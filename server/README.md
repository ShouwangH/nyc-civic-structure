# Vite API Server

This directory contains the Vite development server API routes that replace the Vercel serverless functions for local development.

## Architecture

The API server runs alongside the Vite dev server and handles requests to `/api/*` endpoints.

### Structure

```
server/
├── api-middleware.ts    # Route registration and request handling
├── index.ts             # Entry point, imports all routes
├── lib/
│   ├── auth.ts          # Authentication helpers
│   └── db.ts            # Database connection
└── routes/
    └── overlays.ts      # Overlay CRUD endpoints
```

## Features

- **Hot Module Reload**: API routes reload automatically during development
- **Web API Compatible**: Uses standard `Request`/`Response` objects
- **Type-Safe**: Full TypeScript support with Drizzle ORM
- **Authentication**: Bearer token auth using `EDIT_PASSWORD`

## Available Endpoints

### NYC Open Data Proxies

**Get housing data:**
```bash
GET /api/housing-data
GET /api/housing-data?refresh=true  # Force cache refresh
```

Returns processed housing data from Housing NY, DOB, and PLUTO datasets with 24-hour server-side caching.

**Get capital budget data:**
```bash
GET /api/capital-budget
GET /api/capital-budget?refresh=true  # Force cache refresh
```

Returns NYC capital budget projects from CPDB dataset with 24-hour server-side caching.

### Overlays

**List overlays:**
```bash
GET /api/overlays
GET /api/overlays?scope=city
GET /api/overlays?anchorNode=city:comptroller
```

**Get specific overlay:**
```bash
GET /api/overlays/[id]
```

**Create overlay:**
```bash
POST /api/overlays
Authorization: Bearer [EDIT_PASSWORD]
Content-Type: application/json

{
  "id": "budget_sankey_fy2025",
  "scopeId": "city",
  "anchorNodeId": "city:comptroller",
  "label": "NYC Budget FY2025",
  "type": "sankey",
  "renderTarget": "overlay",
  "dataSource": "/data/nyc_budget_sankey_fy2025.json",
  "dataSnapshot": { /* cached data */ }
}
```

**Update overlay:**
```bash
PUT /api/overlays/[id]
Authorization: Bearer [EDIT_PASSWORD]
Content-Type: application/json

{
  "label": "Updated Label",
  "dataSnapshot": { /* new data */ },
  "lastFetched": "2025-01-07T10:00:00Z"
}
```

### Civic Structure Data

**Get complete dataset for a scope:**
```bash
GET /api/scopes/city/dataset
GET /api/scopes/state/dataset
GET /api/scopes/federal/dataset
```

Returns nodes, edges, and subviews for a government scope.

## Database Schema

### Overlays Table

```typescript
{
  id: string;                    // Primary key
  scopeId: string;               // References scopes.id
  anchorNodeId: string;          // References nodes.id
  label: string;                 // Display name
  description?: string;          // Optional description
  type: 'sankey' | 'sunburst';   // Visualization type
  renderTarget?: string;         // 'overlay' | 'tab' | 'inline'
  dataSource?: string;           // URL or file path
  dataSnapshot?: object;         // Cached data
  metadata?: object;             // Additional config
  lastFetched?: Date;            // Last data fetch timestamp
  createdAt: Date;
  updatedAt: Date;
}
```

## Adding New Routes

1. Create a new file in `server/routes/[name].ts`
2. Define handler functions
3. Register routes using `registerRoute(method, path, handler)`
4. Import the file in `server/index.ts`

Example:

```typescript
// server/routes/nodes.ts
import { registerRoute } from '../api-middleware';
import { db } from '../lib/db';
import { nodes } from '../../api/admin/_drizzle/schema';

async function getNodes(request: Request) {
  const results = await db.select().from(nodes);
  return Response.json({ success: true, data: results });
}

registerRoute('GET', '/api/nodes', getNodes);
```

```typescript
// server/index.ts
import './routes/overlays';
import './routes/nodes'; // Add this
```

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `EDIT_PASSWORD` - Authentication password

## Development

The API server starts automatically with `bun run dev`. API routes are available at `http://localhost:5173/api/*`.

## Production Deployment

For production (Vercel), the existing serverless functions in `/api/admin/` are still used. This server setup is for local development only.

To deploy overlays to production:
1. Create corresponding Vercel serverless function in `/api/admin/overlays/`
2. Copy the logic from `server/routes/overlays.ts`
3. Deploy via Vercel

## Migration from Vercel Functions

The existing Vercel functions in `/api/admin/` can be migrated to the Vite server by:
1. Creating equivalent route files in `server/routes/`
2. Copying handler logic
3. Registering routes in the new structure
4. Testing locally

Both systems can coexist during the migration.
