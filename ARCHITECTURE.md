# NYC Civic Structure - Architecture Documentation

**Last Updated:** 2025-11-12
**Status:** Database-backed Express + React application

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Folder Structure](#folder-structure)
4. [Data Flow](#data-flow)
5. [Frontend Architecture](#frontend-architecture)
6. [Backend Architecture](#backend-architecture)
7. [Database Schema](#database-schema)
8. [Type Safety](#type-safety)
9. [Key Design Patterns](#key-design-patterns)

---

## System Overview

NYC Civic Structure is an interactive visualization platform for exploring NYC government structure, housing development, capital budget, and financial data. The application uses a **database-backed architecture** with:

- **Frontend:** React + Vite + TypeScript
- **Backend:** Express middleware + Drizzle ORM + PostgreSQL (Supabase)
- **Visualization:** Cytoscape.js (graphs), D3 (sankey/sunburst), Deck.gl (maps)

### Architecture Philosophy

1. **Database-First:** All data processing happens at seed time, not runtime
2. **Type-Safe:** End-to-end TypeScript with shared API contracts
3. **Unidirectional Flow:** Strict InputHandler → Controller → State → UI pattern
4. **Separation of Concerns:** Clear boundaries between frontend/backend/visualization

---

## Technology Stack

### Frontend
- **React 19.1** - UI framework
- **TypeScript 5.9** - Type safety
- **Vite 7.1** - Build tool and dev server
- **Tailwind CSS 3.4** - Styling
- **Cytoscape.js 3.33** - Graph visualization
- **D3 (v3)** - Sankey and sunburst diagrams
- **Deck.gl 9.2** - 3D map visualizations
- **MapLibre GL 5.11** - Base map rendering

### Backend
- **Node.js** - Runtime
- **Express** (via Connect middleware) - API server
- **Drizzle ORM 0.44** - Type-safe database queries
- **PostgreSQL** (Supabase) - Database
- **PostGIS** - Geospatial extensions

### Development
- **Bun 1.3** - Package manager (faster than npm)
- **Drizzle Kit** - Schema migrations
- **ESLint + TypeScript ESLint** - Code quality

---

## Folder Structure

```
nyc-civic-structure/
├── src/                          # Frontend React application
│   ├── components/               # React components
│   │   ├── CapitalBudget/       # Capital budget 3D map
│   │   ├── HousingTimelapse/    # Housing timelapse map
│   │   ├── MapsOverlay/         # Map overlay container
│   │   ├── ControlsPanel.tsx    # Scope/view controls
│   │   ├── Details.tsx          # Entity details sidebar
│   │   ├── DiagramViewToggle.tsx # View mode switcher
│   │   ├── GraphCanvas.tsx      # Cytoscape graph container
│   │   ├── OverlayWrapper.tsx   # Sankey/sunburst overlay manager
│   │   ├── SankeyOverlay.tsx    # Sankey diagram overlay
│   │   └── SunburstOverlay.tsx  # Sunburst diagram overlay
│   │
│   ├── controller/              # Action handling and state management
│   │   ├── actions.ts           # Type-safe action creators
│   │   ├── controller.ts        # Main controller (coordinates graph + state)
│   │   ├── inputHandler.ts      # Action queue and serialization
│   │   └── state-manager.ts     # State transitions with business rules
│   │
│   ├── data/                    # Static data definitions
│   │   ├── datasets.ts          # Dataset metadata
│   │   ├── loader.ts            # Data loading utilities
│   │   └── types.ts             # Data type definitions (SubviewDefinition, etc.)
│   │
│   ├── hooks/                   # React hooks
│   │   ├── useCapitalBudgetData.ts
│   │   └── useHousingData.ts
│   │
│   ├── lib/                     # Shared utilities
│   │   ├── api-types.ts         # Type-safe API contracts (frontend ↔ backend)
│   │   └── data/
│   │       └── housingDataProcessor.ts  # Housing data aggregation
│   │
│   ├── services/                # Data fetching services
│   │   └── dataService/
│   │       ├── apiDataService.ts    # Fetch from backend API
│   │       ├── jsonDataService.ts   # Fetch static JSON
│   │       ├── index.ts
│   │       └── types.ts
│   │
│   ├── visualization/           # Visualization libraries
│   │   ├── cytoscape/           # Graph visualization
│   │   │   ├── layouts/         # Layout algorithms (ELK, Klay)
│   │   │   ├── rendering.ts     # Node/edge styling
│   │   │   └── setup.ts         # Cytoscape initialization
│   │   ├── sankey/              # Sankey diagram
│   │   │   ├── SankeyDiagram.tsx
│   │   │   └── types.ts
│   │   └── sunburst/            # Sunburst diagram
│   │       ├── SunburstDiagram.tsx
│   │       └── types.ts
│   │
│   ├── assets/                  # Static assets
│   ├── fonts/                   # Web fonts
│   ├── styles/                  # Global styles
│   ├── types/                   # TypeScript declarations
│   ├── App.tsx                  # Root component (owns VisualizationState)
│   └── main.tsx                 # Application entry point
│
├── server/                      # Backend API
│   ├── lib/                     # Shared backend utilities
│   │   ├── cache.ts             # Generic in-memory cache
│   │   ├── db.ts                # Drizzle database connection
│   │   └── schema.ts            # Database schema (Drizzle ORM)
│   │
│   ├── routes/                  # API endpoints
│   │   ├── capital-budget.ts    # GET /api/capital-budget
│   │   ├── financial-data.ts    # GET /api/financial-data, /sankey/:id, /sunburst/:id
│   │   └── housing-data.ts      # GET /api/housing-data
│   │
│   ├── migrations/              # Database migrations
│   ├── api-middleware.ts        # Route registration middleware
│   └── index.ts                 # Server entry point
│
├── scripts/                     # Data seeding scripts
│   ├── seed-housing.js          # Seed housing data from DCP Housing Database
│   ├── seed-capital-budget.js   # Seed capital projects from CPDB
│   ├── seed-financial.js        # Seed sankey/sunburst datasets
│   ├── check-duplicate-locations.js  # Diagnostic tool
│   └── check-specific-addresses.js   # Diagnostic tool
│
├── data/                        # Static data files
│   └── city-intra.json          # Civic structure graph definition
│
├── docs/                        # Documentation
│   ├── DATA_FLOW.md             # Unidirectional flow architecture
│   └── state-refactor-plan.md   # Historical state refactor
│
├── drizzle.config.ts            # Drizzle ORM configuration
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript configuration
├── REFACTOR_PLAN.md             # Master refactor plan
├── REFACTOR_STATUS.md           # Detailed migration status
└── ARCHITECTURE.md              # This file
```

### Key Organizational Principles

1. **Frontend (`/src`)** and **Backend (`/server`)** are **completely separate**
   - No imports from `/server` in `/src` code
   - Only connection: Vite dev server imports server middleware
   - Production: Frontend is static build, backend is Express server

2. **Controller in its own folder** (`/src/controller/`)
   - Previously scattered across `visualization/cytoscape/`
   - Now centralized: actions, controller, inputHandler, state-manager

3. **Visualization libraries isolated** (`/src/visualization/`)
   - Each visualization (cytoscape, sankey, sunburst) is self-contained
   - No cross-visualization dependencies

4. **Type safety at boundaries** (`/src/lib/api-types.ts`)
   - Shared type definitions for API contracts
   - Compile-time safety for frontend ↔ backend communication

---

## Data Flow

See **[docs/DATA_FLOW.md](docs/DATA_FLOW.md)** for comprehensive documentation.

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      DATA SEEDING (one-time)                │
└─────────────────────────────────────────────────────────────┘
                                ↓
    NYC Open Data APIs → Seed Scripts → PostgreSQL Database
    - DCP Housing Database        ↓
    - CPDB (Capital Projects)     → Processed, deduplicated,
    - Financial datasets             and optimized data
                                ↓
┌─────────────────────────────────────────────────────────────┐
│                   RUNTIME (user interaction)                │
└─────────────────────────────────────────────────────────────┘
                                ↓
    User Interaction → InputHandler (queue) → Controller
                                                    ↓
                                          Database Queries (API)
                                                    ↓
                                    React State Update (setState)
                                                    ↓
                                          Component Re-render
```

### Unidirectional Flow (Frontend)

```
User Interaction
      ↓
  InputHandler (serializes actions via queue)
      ↓
  Controller (processes actions, coordinates state)
      ↓
  App.tsx (React setState updates VisualizationState)
      ↓
  Components (re-render with new state)
```

**Key Rules:**
- ✅ Components **MUST** use `inputHandler.enqueue(action)`
- ❌ Components **MUST NOT** call `controller.dispatch()` directly
- ❌ Components **MUST NOT** call `setState()` directly

---

## Frontend Architecture

### Component Hierarchy

```
App.tsx (state owner: VisualizationState)
├── ControlsPanel (scope/view mode controls)
├── DiagramViewToggle (diagram/financials/maps)
├── Details (entity details sidebar)
├── GraphCanvas (Cytoscape graph + runtime setup)
│   └── Creates: { cy, controller, inputHandler }
├── OverlayWrapper (manages overlays based on state)
│   ├── SankeyOverlay
│   │   └── SankeyDiagram (D3 visualization)
│   └── SunburstOverlay
│       └── SunburstDiagram (D3 visualization)
└── MapsOverlay (geospatial visualizations)
    ├── HousingTimelapse
    │   ├── Map3D (Deck.gl hexagon layer)
    │   ├── Legend
    │   └── TimeSlider
    └── CapitalBudgetMap
        ├── Map3D (Deck.gl column layer)
        ├── Legend
        └── Tooltip
```

### State Management

**Single Source of Truth:** `VisualizationState` in `App.tsx`

```typescript
type VisualizationState = {
  // Selection state (mutually exclusive)
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // Subview state
  activeSubviewId: string | null;

  // Scope filtering
  activeScope: GovernmentScope | null;

  // UI state
  controlsOpen: boolean;
  sidebarHover: boolean;
  viewMode: 'diagram' | 'financials' | 'maps';
  activeTab: 'details' | 'processes';

  // Overlay state
  sankeyOverlay?: { subview: SubviewDefinition; data: SankeyData; } | null;
  sunburstOverlay?: { subview: SubviewDefinition; data: SunburstData; } | null;
};
```

### Action System

All user interactions are modeled as **typed actions**:

```typescript
// src/controller/actions.ts
export type GraphAction =
  | NodeClickAction
  | EdgeClickAction
  | BackgroundClickAction
  | ActivateSubviewAction
  | DeactivateSubviewAction
  | ChangeScopeAction
  | ClearSelectionsAction
  | ChangeViewModeAction
  | ChangeControlPanelTabAction;
```

Actions are created via **action creators** and processed through the queue:

```typescript
// Example: User clicks a node
inputHandler.enqueue(actions.nodeClick('node-123'));
```

---

## Backend Architecture

### API Endpoints

All endpoints return a consistent `ApiResponse<T>` format:

```typescript
type ApiResponse<T> =
  | { success: true; cached: boolean; data: T }
  | { success: false; error: string; message: string };
```

**Available Endpoints:**

| Endpoint | Method | Description | Cache TTL |
|----------|--------|-------------|-----------|
| `/api/housing-data` | GET | Housing buildings + demolitions (2014+) | 24 hours |
| `/api/capital-budget` | GET | Capital projects with GeoJSON | 24 hours |
| `/api/financial-data` | GET | List of available datasets | 24 hours |
| `/api/financial-data/sankey/:id` | GET | Sankey dataset by ID | 24 hours |
| `/api/financial-data/sunburst/:id` | GET | Sunburst dataset by ID | 24 hours |

### Caching Strategy

All API routes use a shared `InMemoryCache<T>` class:

```typescript
// server/lib/cache.ts
class InMemoryCache<T> {
  private data: T | null = null;
  private timestamp: number = 0;
  private readonly ttlMs: number = 24 * 60 * 60 * 1000; // 24 hours

  get(): T | null;
  set(data: T): void;
  isValid(): boolean;
}
```

**Cache bypass:** Add `?refresh=true` query parameter to force fresh data.

### Database Queries

All routes use **Drizzle ORM** for type-safe queries:

```typescript
// Example: Fetch housing buildings
const buildings = await db
  .select()
  .from(housingBuildings)
  .where(gte(housingBuildings.completionYear, 2014))
  .execute();
```

**Benefits:**
- Type-safe queries (TypeScript knows column types)
- Auto-completion in IDE
- Compile-time error checking
- No raw SQL strings

---

## Database Schema

### Tables

| Table | Records | Purpose |
|-------|---------|---------|
| `housing_buildings` | ~37,000 | Housing completions (2014-2025) |
| `housing_demolitions` | ~17,000 | Building demolitions (2014-2025) |
| `capital_projects` | ~15,000 | Capital budget projects with GeoJSON |
| `sankey_datasets` | ~10 | Budget/pension flow datasets |
| `sunburst_datasets` | ~10 | Revenue/expense hierarchy datasets |

### Key Schema Features

1. **Housing Buildings** (`housing_buildings`)
   - DCP Housing Database as primary source
   - Housing NY affordable overlay applied
   - Deduplication by BBL + year (prefer highest unit count)
   - Net unit changes (`classANet`) for accurate counting
   - Geography fields: NTA2020, census tract, council district

2. **Capital Projects** (`capital_projects`)
   - PostGIS GeoJSON geometry support
   - Budget allocations: allocate, commit, spent, planned
   - Fiscal year tracking

3. **Financial Datasets** (`sankey_datasets`, `sunburst_datasets`)
   - JSON storage for D3 visualization data
   - Metadata: fiscal year, units, total value
   - Pre-processed hierarchies for performance

### Migrations

- **Location:** `server/migrations/`
- **Tool:** Drizzle Kit
- **Commands:**
  - `npm run db:generate` - Generate migration from schema changes
  - `npm run db:push` - Push schema to database
  - `npm run db:studio` - Open Drizzle Studio (GUI)

---

## Type Safety

### Type-Safe API Contracts

**Location:** `src/lib/api-types.ts`

All API requests and responses are typed:

```typescript
// Frontend code
const response = await fetch('/api/housing-data');
const result: HousingDataResponse = await response.json();

if (isSuccessResponse(result)) {
  // TypeScript knows result.data has buildings and demolitions
  const { buildings, demolitions } = result.data;
}
```

### Database Type Safety

**Using Drizzle ORM's type inference:**

```typescript
// server/lib/schema.ts
export const housingBuildings = pgTable('housing_buildings', {
  id: text('id').primaryKey(),
  latitude: doublePrecision('latitude').notNull(),
  // ... other fields
});

// Inferred type from schema
export type HousingBuilding = typeof housingBuildings.$inferSelect;
```

**Benefits:**
- ~50 `any` types eliminated from server routes
- TypeScript validates all field access
- Caught 4+ field access bugs during migration
- Auto-completion for database columns

### Component Props

All components use explicit TypeScript interfaces:

```typescript
type HousingTimelapseProps = {
  data: ProcessedBuilding[];
  demolitionData: DemolitionRecord[];
  onReady?: () => void;
};
```

---

## Key Design Patterns

### 1. **Unidirectional Data Flow**

**Problem:** React components directly mutating state leads to race conditions and bugs.

**Solution:** All state changes flow through a single path:
```
User → InputHandler (queue) → Controller → setState → Components
```

**Enforcement:**
- All components access `inputHandler` to dispatch actions
- Controller is the only place that calls `setState`
- StateManager enforces business rules (e.g., node/edge mutual exclusivity)

**See:** `docs/DATA_FLOW.md`

---

### 2. **Action Queue Serialization**

**Problem:** Rapid user interactions cause interleaved async operations.

**Solution:** `InputHandler` maintains a queue and processes actions sequentially:

```typescript
// src/controller/inputHandler.ts
async enqueue(action: GraphAction): Promise<void> {
  this.queue.push(action);
  if (!this.processing) {
    await this.processQueue();
  }
}
```

**Benefits:**
- Async operations complete before next action starts
- No race conditions
- Predictable state transitions

---

### 3. **Database-First Processing**

**Problem:** Processing data at runtime is slow and error-prone.

**Solution:** Move all data processing to seed time:

```
NYC Open Data → Seed Script → PostgreSQL → API → Frontend
    (complex)      ↓         (optimized)    ↓    (simple)
               Deduplication              Just aggregate
               Enrichment                 by year/borough
               Validation
```

**Benefits:**
- Faster frontend (no complex processing)
- Single source of truth (database)
- Easier to verify data quality
- Can run seed scripts weekly via cron

---

### 4. **Generic In-Memory Cache**

**Problem:** Duplicate caching logic in every API route.

**Solution:** Shared `InMemoryCache<T>` class:

```typescript
// server/routes/housing-data.ts
const cache = new InMemoryCache<HousingDataCache>();

const cachedData = cache.get();
if (cachedData) {
  return Response.json({ success: true, cached: true, data: cachedData });
}
```

**Benefits:**
- 60+ lines of duplicate code eliminated
- Consistent caching behavior
- Type-safe cache values

---

### 5. **Type-Safe API Contracts**

**Problem:** Frontend and backend types can drift, causing runtime errors.

**Solution:** Shared type definitions in `src/lib/api-types.ts`:

```typescript
export type HousingDataResponse = ApiResponse<{
  buildings: ProcessedBuilding[];
  demolitions: DemolitionRecord[];
}>;
```

**Benefits:**
- Compile-time safety for API calls
- Caught 4+ field access bugs during migration
- Auto-completion for API response fields
- Type guard for safe narrowing (`isSuccessResponse`)

---

### 6. **Modular Controller Architecture**

**Problem:** Original `controller.ts` was 915 lines and hard to maintain.

**Solution:** Split into focused modules:

```
src/controller/
├── actions.ts          # Action type definitions and creators
├── controller.ts       # Main controller (coordinates modules)
├── inputHandler.ts     # Action queue and serialization
└── state-manager.ts    # State transitions with business rules
```

**Benefits:**
- Each module has single responsibility
- Easier to test and modify
- Clear separation of concerns

---

## Development Workflow

### Initial Setup

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with DATABASE_URL

# Push schema to database
npm run db:push

# Seed data
npm run seed:all
```

### Development Commands

```bash
# Start dev server (frontend + API middleware)
npm run dev

# Run specific seed scripts
npm run seed:housing
npm run seed:capital
npm run seed:financial

# Database management
npm run db:studio        # Open Drizzle Studio
npm run db:push          # Push schema changes
npm run db:generate      # Generate migration

# Diagnostics
npm run check:duplicates # Find duplicate locations
npm run verify:housing   # Verify housing data
```

### Production Build

```bash
# Build frontend
npm run build

# Output: dist/ folder with static assets
```

---

## Performance Considerations

### Frontend

1. **Lazy Loading:** Large visualizations loaded on-demand
2. **Memoization:** React components memoized where appropriate
3. **Canvas Rendering:** Cytoscape uses canvas for 1000+ nodes
4. **Throttling:** Map interactions throttled to prevent lag

### Backend

1. **In-Memory Caching:** 24-hour TTL for all API responses
2. **Database Indexing:** Indexes on commonly queried fields
3. **Pre-Processed Data:** Complex calculations done at seed time
4. **Efficient Queries:** Drizzle generates optimized SQL

### Data Size

| Dataset | Records | API Response Size | Load Time |
|---------|---------|-------------------|-----------|
| Housing | 37,000 | ~5 MB | ~500ms (cached: ~50ms) |
| Capital | 15,000 | ~8 MB | ~600ms (cached: ~60ms) |
| Financial | 20 | ~200 KB | ~100ms (cached: ~10ms) |

---

## Testing Strategy

### Current Coverage

- ✅ Data integrity verified (deduplication, unit counting)
- ✅ API endpoints tested manually
- ✅ TypeScript compilation validates types
- ⏳ Unit tests (not yet implemented)
- ⏳ Integration tests (not yet implemented)

### Recommended Testing Approach

1. **Unit Tests:** Controller actions, state transitions
2. **Integration Tests:** API endpoints with test database
3. **E2E Tests:** User flows (click node → see details)
4. **Visual Regression:** Screenshot comparisons for visualizations

---

## Known Issues & Limitations

1. **No automated tests** - Testing is manual
2. **No production deployment guide** - Only local dev documented
3. **Cache invalidation** - No automatic cache refresh (manual `?refresh=true`)
4. **Data freshness** - No automated data updates (manual seed runs)
5. **Error handling** - Basic error handling, no retry logic

---

## Future Enhancements

### Short-Term
- Automated tests (Jest + React Testing Library)
- Production deployment (Docker + fly.io/Railway)
- Automated data refresh (weekly cron jobs)

### Medium-Term
- User authentication and saved views
- Custom data filters and queries
- Export visualizations (PNG, PDF)
- Real-time data updates (WebSocket)

### Long-Term
- Multi-city support
- Predictive analytics (ML models)
- Public API for third-party developers
- Collaborative annotations

---

## Contributing

### Code Style

- **TypeScript:** Strict mode enabled
- **React:** Functional components with hooks
- **Naming:** camelCase for variables, PascalCase for components
- **Imports:** Absolute imports preferred (`src/...`)

### Pull Request Process

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes with clear commit messages
3. Ensure TypeScript compiles: `npm run build`
4. Test changes locally: `npm run dev`
5. Push and create PR

### Architecture Changes

For significant architectural changes:
1. Discuss in GitHub issue first
2. Update this ARCHITECTURE.md
3. Update REFACTOR_PLAN.md if applicable
4. Document in commit message

---

## Additional Resources

- **[DATA_FLOW.md](docs/DATA_FLOW.md)** - Detailed data flow patterns
- **[REFACTOR_PLAN.md](REFACTOR_PLAN.md)** - Master refactor plan
- **[REFACTOR_STATUS.md](REFACTOR_STATUS.md)** - Migration status details
- **[README.md](README.md)** - User-facing documentation

---

**Questions or issues?** See GitHub issues or contact the maintainers.
