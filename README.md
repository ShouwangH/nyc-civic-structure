# NYC Civic Structure Visualization

Interactive visualization of New York City government structure with integrated data overlays for housing development, capital budget projects, and financial flows.

## Features

### Core Visualization
- **Interactive Cytoscape Graph**: Explore NYC government structure across city, state, and federal scopes
- **Hierarchical Subviews**: Drill down into agencies, departments, and their internal structures
- **Dynamic Layouts**: ELK-powered automatic graph layouts with smooth animations

### Data Overlays
- **Housing Timelapse**: 3D visualization of NYC housing development (2014-2025) using deck.gl
  - Tracks new construction, demolitions, and affordable housing
  - Calculates net new units after demolitions
  - Data from Housing NY, DOB Job Applications, and PLUTO datasets
- **Capital Budget Projects**: Map view of NYC capital projects with budget allocations
  - CPDB dataset with project footprints and fiscal information
  - Filter by agency, project type, and fiscal year
- **Financial Flows**: Sankey and Sunburst visualizations
  - NYC expense budget flows
  - Pension fund allocations
  - Revenue streams

### Database & API
- **PostgreSQL + Drizzle ORM**: Overlay metadata and configuration storage
- **Server-side Caching**: 24-hour cache for NYC Open Data API calls
- **Vite Dev Server API**: Local development endpoints with hot reload

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Graph Visualization**: Cytoscape.js with ELK layout engine
- **3D Map Visualization**: deck.gl + MapLibre GL
- **Data Visualization**: D3.js (Sankey, Sunburst)
- **Database**: PostgreSQL with Drizzle ORM
- **Package Manager**: Bun 1.3.0
- **Deployment**: Vercel with serverless functions

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.3.0 or later
- PostgreSQL database (for overlay storage)

### Installation

1. Clone the repository

2. Install dependencies:
   ```bash
   bun install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

   Required variables:
   - `DATABASE_URL`: PostgreSQL connection string
   - `EDIT_PASSWORD`: Authentication password for editing overlays

4. Run database migrations:
   ```bash
   bun run drizzle-kit push
   ```

### Development

Start the development server:
```bash
bun run dev
```

The app will be available at `http://localhost:5173` (or next available port).

The dev server includes:
- Hot module reload
- API middleware for NYC Open Data proxying
- Server-side caching for external API calls

### Building for Production

```bash
bun run build
```

Preview the production build:
```bash
bun run preview
```

## Project Structure

```
├── api/                    # Vercel serverless functions (production)
├── server/                 # Vite dev server API routes (development)
│   ├── routes/            # API endpoint handlers
│   └── lib/               # Shared utilities (auth, db)
├── src/
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Data processing and utilities
│   └── visualization/     # Cytoscape controller and rendering
├── data/                   # JSON data files for civic structure
├── public/                # Static assets
└── scripts/               # Build and data processing scripts
```

## API Endpoints

### Development (Vite Server)
- `GET /api/housing-data` - Housing development data (cached)
- `GET /api/capital-budget` - Capital budget projects (cached)
- `GET /api/overlays` - List all overlays
- `GET /api/overlays/:id` - Get specific overlay
- `POST /api/overlays` - Create overlay (requires auth)
- `PUT /api/overlays/:id` - Update overlay (requires auth)

### Production (Vercel)
Equivalent endpoints available via Vercel serverless functions in `/api/admin/`.

## Data Sources

- **Housing NY Units by Building**: [hg8x-zxpr](https://data.cityofnewyork.us/Housing-Development/Housing-New-York-Units-by-Building/hg8x-zxpr)
- **DOB Job Applications**: [ic3t-wcy2](https://data.cityofnewyork.us/Housing-Development/DOB-Job-Application-Filings/ic3t-wcy2)
- **PLUTO**: [64uk-42ks](https://data.cityofnewyork.us/City-Government/Primary-Land-Use-Tax-Lot-Output-PLUTO-/64uk-42ks)
- **Capital Projects Database**: [9jkp-n57r](https://data.cityofnewyork.us/City-Government/Capital-Projects-Database-CPDB-Polygons/9jkp-n57r)

## License

MIT
