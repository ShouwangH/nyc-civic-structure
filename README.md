# NYC Civic Structure Visualization

Interactive visualization of New York City government structure with integrated data overlays for housing development, capital budget projects, and financial flows.

> **Architecture:** Database-backed Express + React application with comprehensive type safety

## Features

### Core Visualization
- **Interactive Cytoscape Graph**: Explore NYC government structure across city, state, and federal scopes
- **Hierarchical Subviews**: Drill down into agencies, departments, and their internal structures
- **Dynamic Layouts**: ELK-powered automatic graph layouts with smooth animations
- **Unidirectional Data Flow**: Predictable state management with action queue serialization

### Data Overlays
- **Housing Timelapse**: 3D visualization of NYC housing development (2014-2025) using deck.gl
  - Tracks new construction, demolitions, and affordable housing
  - Calculates net new units after demolitions
  - **Data Source**: DCP Housing Database + Housing NY overlay
  - **299,886 total units** (69,032 affordable, 23.0%)
  - **282,607 net new units** after demolitions

- **Capital Budget Projects**: Map view of NYC capital projects with budget allocations
  - CPDB dataset with project footprints and fiscal information
  - Filter by agency, project type, and fiscal year
  - PostGIS GeoJSON geometry support

- **Financial Flows**: Sankey and Sunburst visualizations
  - NYC expense budget flows
  - Pension fund allocations
  - Revenue streams by category and agency

### Database-First Architecture
- **PostgreSQL + Drizzle ORM**: Type-safe database queries with schema inference
- **Data Processing at Seed Time**: Complex transformations done once, stored in database
- **In-Memory Caching**: 24-hour cache for all API responses
- **Type-Safe API Contracts**: Shared types between frontend and backend

## Tech Stack

### Frontend
- **React 19** + **TypeScript 5.9** + **Vite 7.1**
- **Tailwind CSS 3.4** - Styling
- **Cytoscape.js 3.33** - Graph visualization with ELK layout engine
- **deck.gl 9.2** + **MapLibre GL 5.11** - 3D map visualizations
- **D3.js** - Sankey and Sunburst diagrams

### Backend
- **Node.js** - Runtime
- **Express** (via Connect middleware) - API server
- **Drizzle ORM 0.44** - Type-safe database queries
- **PostgreSQL** (Supabase) - Database with PostGIS

### Development
- **Bun 1.3.0** - Package manager (faster than npm)
- **Drizzle Kit** - Schema migrations
- **ESLint + TypeScript ESLint** - Code quality

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.3.0 or later
- PostgreSQL database (Supabase recommended)

### Installation

1. **Clone the repository**

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Required variables:
   - `DATABASE_URL`: PostgreSQL connection string (direct, not pooled)

4. **Push database schema:**
   ```bash
   bun run db:push
   ```

5. **Seed the database:**
   ```bash
   bun run seed:all
   ```

   This seeds all datasets:
   - Housing data from DCP Housing Database
   - Capital projects from CPDB
   - Financial datasets (sankey/sunburst)

   Individual seed scripts:
   ```bash
   bun run seed:housing      # Housing data only
   bun run seed:capital      # Capital projects only
   bun run seed:financial    # Financial datasets only
   ```

### Development

Start the development server:
```bash
bun run dev
```

The app will be available at `http://localhost:5173` (or next available port).

The dev server includes:
- Hot module reload for frontend
- API middleware with database-backed endpoints
- In-memory caching for fast responses

### Building for Production

```bash
bun run build
```

Preview the production build:
```bash
bun run preview
```

### Database Management

```bash
bun run db:studio        # Open Drizzle Studio (database GUI)
bun run db:push          # Push schema changes to database
bun run db:generate      # Generate migration from schema changes
```

### Data Refresh

To refresh data from NYC Open Data sources:

```bash
bun run seed:all
```

## Project Structure

See **[ARCHITECTURE.md](ARCHITECTURE.md)** for comprehensive documentation.

```
nyc-civic-structure/
├── src/                       # Frontend React application
│   ├── components/            # React components
│   ├── controller/            # Action handling & state management
│   ├── data/                  # Static data definitions
│   ├── hooks/                 # React hooks
│   ├── lib/                   # Shared utilities & API types
│   ├── services/              # Data fetching services
│   └── visualization/         # Cytoscape, D3, deck.gl visualizations
│
├── server/                    # Backend API
│   ├── lib/                   # DB connection, cache, schema
│   └── routes/                # API endpoints
│
├── scripts/                   # Data seeding scripts
│   ├── seed-housing.js        # DCP Housing Database → PostgreSQL
│   ├── seed-capital-budget.js # CPDB → PostgreSQL
│   └── seed-financial.js      # Financial datasets → PostgreSQL
│
├── data/                      # Static data files
│   └── city-intra.json        # Civic structure graph definition
│
├── docs/                      # Documentation
│   └── DATA_FLOW.md           # Unidirectional flow architecture
│
└── ARCHITECTURE.md            # Complete architecture reference
```

## API Endpoints

All endpoints return a consistent `ApiResponse<T>` format:

```typescript
type ApiResponse<T> =
  | { success: true; cached: boolean; data: T }
  | { success: false; error: string; message: string };
```

### Available Endpoints

| Endpoint | Description | Cache TTL |
|----------|-------------|-----------|
| `GET /api/housing-data` | Housing buildings + demolitions | 24 hours |
| `GET /api/capital-budget` | Capital projects with GeoJSON | 24 hours |
| `GET /api/financial-data` | List available datasets | 24 hours |
| `GET /api/financial-data/sankey/:id` | Sankey dataset by ID | 24 hours |
| `GET /api/financial-data/sunburst/:id` | Sunburst dataset by ID | 24 hours |

**Cache bypass:** Add `?refresh=true` query parameter to force fresh data.

## Data Sources

### Housing Data
- **Primary:** [DCP Housing Database](https://data.cityofnewyork.us/Housing-Development/DCP-Housing-Database/2kzu-zgw7) (ArcGIS REST API)
- **Overlay:** [Housing NY Units by Building](https://data.cityofnewyork.us/Housing-Development/Housing-New-York-Units-by-Building/hg8x-zxpr)
- **Processing:**
  - Deduplication by BBL + completion year
  - Net unit changes (`classANet` field)
  - Affordable overlay applied to matching BBLs
  - **Result:** 299,886 units (69,032 affordable, 23.0%)

### Capital Budget
- **Source:** [Capital Projects Database (CPDB)](https://data.cityofnewyork.us/City-Government/Capital-Projects-Database-CPDB-Polygons/9jkp-n57r)
- **Format:** GeoJSON with PostGIS geometry
- **Fields:** Budget allocations, fiscal year, agency, project type

### Financial Data
- **Budget Sankey:** NYC expense budget flows by agency
- **Pension Sankey:** Pension fund allocations
- **Revenue Sunburst:** Revenue streams by category
- **Expense Sunburst:** Expense hierarchies by department

## Type Safety

This project uses comprehensive type safety:

- **Database Types:** Drizzle ORM schema inference (`$inferSelect`)
- **API Contracts:** Shared types in `src/lib/api-types.ts`
- **Component Props:** Explicit TypeScript interfaces
- **No `any` Types:** Eliminated ~50 `any` types during refactor

See **[ARCHITECTURE.md](ARCHITECTURE.md#type-safety)** for details.

## Key Design Patterns

1. **Unidirectional Data Flow**
   - User → InputHandler (queue) → Controller → setState → Components
   - See [docs/DATA_FLOW.md](docs/DATA_FLOW.md)

2. **Database-First Processing**
   - Complex transformations at seed time
   - Frontend just aggregates and displays

3. **Type-Safe API Contracts**
   - Shared types prevent frontend/backend drift
   - Compile-time safety for API calls

4. **Generic In-Memory Cache**
   - Consistent caching across all routes
   - Type-safe cache values

See **[ARCHITECTURE.md](ARCHITECTURE.md#key-design-patterns)** for full details.

## Development Workflow

### Testing Changes

```bash
# Run production build to verify
bun run build

# Test production bundle locally
bun run preview
```

### Data Diagnostics

```bash
# Find duplicate locations in housing data
bun run check:duplicates

# Verify housing data counts
bun run verify:housing
```

### Code Quality

```bash
# Lint check
bun run lint

# TypeScript type check
bun run build
```

## Performance

| Dataset | Records | Response Size | Load Time (Cached) |
|---------|---------|---------------|-------------------|
| Housing | 37,000 | ~5 MB | ~50ms |
| Capital | 15,000 | ~8 MB | ~60ms |
| Financial | 20 | ~200 KB | ~10ms |

**Optimizations:**
- In-memory caching (24-hour TTL)
- Database indexing on queried fields
- Pre-processed data (no runtime computation)
- Canvas rendering for large graphs (1000+ nodes)

## Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete system architecture
- **[docs/DATA_FLOW.md](docs/DATA_FLOW.md)** - Unidirectional flow patterns

## Contributing

### Code Style

- **TypeScript:** Strict mode enabled
- **React:** Functional components with hooks
- **Naming:** camelCase for variables, PascalCase for components
- **Imports:** Absolute imports from `src/`

### Pull Request Process

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes with clear commit messages
3. Ensure TypeScript compiles: `bun run build`
4. Test changes locally: `bun run dev`
5. Push and create PR

## License

MIT

---

**Questions?** See [ARCHITECTURE.md](ARCHITECTURE.md) for comprehensive documentation.
