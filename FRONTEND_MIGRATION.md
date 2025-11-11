# Frontend Migration Guide

This document outlines the frontend changes required to work with the new database-backed API architecture.

## Overview

The backend has been refactored to serve data from a PostgreSQL database instead of fetching from NYC Open Data APIs on-demand. The frontend currently expects the old data format and needs to be updated to work with the new structure.

## API Endpoint Changes

### Housing Data

**Old Endpoint**: `GET /api/housing-data`

**Old Response Format**:
```json
{
  "success": true,
  "cached": boolean,
  "data": {
    "housingNyData": [...],  // Raw NYC Open Data records
    "dobData": [...],          // Raw DOB records
    "plutoData": [...],        // Raw PLUTO records
    "demolitionData": [...]    // Raw demolition records
  }
}
```

**New Response Format**:
```json
{
  "success": true,
  "cached": boolean,
  "data": {
    "buildings": [...],      // Processed building records
    "demolitions": [...]     // Processed demolition records
  }
}
```

**Changes Needed**:
- **File**: `/src/lib/data/housingDataProcessor.ts`
  - This 805-line file can be **significantly simplified** or **removed entirely**
  - Processing logic (BBL normalization, unit aggregation, classification) now happens at seed time
  - Frontend receives pre-processed data matching the `HousingBuilding` schema type

- **File**: `/src/hooks/useHousingData.ts`
  - Update to expect `buildings` and `demolitions` arrays
  - Remove calls to processing functions (data is already processed)
  - Map database fields to component props if needed

### Capital Budget Data

**Old Endpoint**: `GET /api/capital-budget`

**Old Response Format**:
```json
{
  "success": true,
  "cached": boolean,
  "count": number,
  "data": [...]  // GeoJSON features
}
```

**New Response Format**:
```json
{
  "success": true,
  "cached": boolean,
  "count": number,
  "data": [...]  // GeoJSON features (same format, from database)
}
```

**Changes Needed**:
- **File**: `/src/hooks/useCapitalBudgetData.ts`
  - No changes required - format is identical
  - Data comes from database instead of NYC Open Data API

### Financial Visualizations

**Old Approach**:
- Static JSON files in `/public/data/`
  - `nyc_budget_sankey_fy2025_generated.json`
  - `nyc_pension_sankey.json`
  - `nyc_revenue_sunburst_fy2025_generated.json`
  - `nyc_expense_sunburst_fy2025_generated.json`
- Loaded via `fetch('/data/filename.json')`

**New Endpoints**:

1. **List all datasets**: `GET /api/financial-data`
   ```json
   {
     "success": true,
     "cached": boolean,
     "data": {
       "sankey": [{id, label, description, fiscalYear, dataType, ...}, ...],
       "sunburst": [{id, label, description, fiscalYear, dataType, ...}, ...]
     }
   }
   ```

2. **Get sankey by ID**: `GET /api/financial-data/sankey/:id`
   - Example: `/api/financial-data/sankey/budget-fy2025`
   - Returns full dataset with `nodes` and `links`

3. **Get sunburst by ID**: `GET /api/financial-data/sunburst/:id`
   - Example: `/api/financial-data/sunburst/revenue-fy2025`
   - Returns full dataset with `hierarchyData`

**Changes Needed**:
- **File**: `/src/components/OverlayWrapper.tsx` (lines 46-77)
  - Replace `fetch('/data/...')` calls with API endpoint calls
  - Update data loading logic:
    ```typescript
    // Old
    const response = await fetch('/data/nyc_budget_sankey_fy2025_generated.json');
    const data = await response.json();

    // New
    const response = await fetch('/api/financial-data/sankey/budget-fy2025');
    const { data } = await response.json();
    ```
  - Update for all four visualization types

- **File**: `/src/visualization/sankey/types.ts`
  - Types may need minor adjustments to match database schema

- **File**: `/src/visualization/sunburst/types.ts`
  - Types may need minor adjustments to match database schema

## Data Shape Changes

### Housing Buildings

The `HousingBuilding` type from the database schema includes:

```typescript
{
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  address: string;
  borough: string;
  bbl?: string;
  bin?: string;
  postcode?: string;
  communityBoard?: string;
  councilDistrict?: string;
  censusTract?: string;
  nta?: string;

  completionYear: number;
  completionMonth?: number;
  completionDate?: string;

  totalUnits: number;
  affordableUnits: number;
  affordablePercentage: number;

  // Detailed unit breakdowns...
  extremeLowIncomeUnits?: number;
  // ... etc

  buildingType: string;
  physicalBuildingType?: string;
  buildingClass?: string;
  zoningDistrict?: string;

  dataSource: string; // 'housing-ny' | 'pluto' | 'dob'
  isRenovation: boolean;

  projectId?: string;
  projectName?: string;
  constructionType?: string;
  // ... etc
}
```

**Mapping**:
- Old `HousingBuildingRecord` → Now `HousingBuilding`
- Old `ProcessedBuilding` → Now `HousingBuilding` (already processed)
- The `housingDataProcessor.ts` processing logic is no longer needed

### Housing Demolitions

```typescript
{
  id: string;
  bbl?: string;
  borough: string;
  address: string;
  latitude?: number;
  longitude?: number;

  demolitionYear: number;
  demolitionMonth?: number;
  demolitionDate?: string;

  estimatedUnits: number;
  buildingClass?: string;

  jobNumber?: string;
  jobType?: string;
  jobStatus?: string;

  hasNewConstruction: boolean; // Indicates if BBL has new construction
}
```

## Testing Frontend Changes

After making the above changes:

1. **Run database migrations**:
   ```bash
   bun run db:push
   ```

2. **Seed database** (requires valid DATABASE_URL in .env):
   ```bash
   bun run seed:all
   ```

3. **Start dev server**:
   ```bash
   bun run dev
   ```

4. **Test each visualization**:
   - Housing timelapse (3D map)
   - Capital budget map
   - Budget sankey
   - Pension sankey
   - Revenue sunburst
   - Expense sunburst

5. **Verify data loading**:
   - Check browser console for API calls
   - Verify no 404s for `/data/*.json` files
   - Confirm data displays correctly

## Component Files to Update

**Priority 1 (Required for basic functionality)**:
- `/src/lib/data/housingDataProcessor.ts` - Simplify or remove
- `/src/hooks/useHousingData.ts` - Update response handling
- `/src/components/OverlayWrapper.tsx` - Update financial data loading

**Priority 2 (Cleanup)**:
- `/src/components/HousingTimelapse/types.ts` - Update types if needed
- `/src/visualization/sankey/types.ts` - Update types if needed
- `/src/visualization/sunburst/types.ts` - Update types if needed

**Priority 3 (Optional optimization)**:
- Remove unused data transformation functions
- Remove NYC Open Data API URLs (now in seed scripts)
- Update error handling for database queries vs API failures

## Rollback Plan

If issues arise:

1. **Revert git commits** to before Phase 3
2. **Restore `/api` directory** from git history
3. **Restore `/public/data/*.json` files** from git history
4. **Frontend continues using old endpoints**

The old architecture will work until frontend is fully migrated.

## Notes

- The database schema is designed to closely match the old `ProcessedBuilding` type
- Most frontend logic should work with minimal changes
- Main benefit: **805 lines of client-side processing removed**
- Performance improvement: Database queries (indexed) vs client-side array operations
- Data freshness: Controlled via seed script schedule (cron jobs)

## Questions?

See MIGRATION_GUIDE.md for database setup instructions.
See ARCHITECTURE.md (to be created) for overall system design.
