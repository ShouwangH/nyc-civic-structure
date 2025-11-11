# NYC Civic Structure - Master Refactor Plan

**Last Updated:** 2025-11-11
**Branch:** `claude/refactor-reorganize-codebase-011CV1b3tqtT8x54s6Szy54H`
**Project Goal:** Migrate from Vercel serverless architecture to database-backed Express server

---

## 📊 Overall Progress: 45% Complete

```
Phase 1: Database Schema         ████████████████████░  95% ✅
Phase 2: Seed Scripts            ████████████████░░░░░  80% 🚧
Phase 3: Backend Routes          ░░░░░░░░░░░░░░░░░░░░   0% ❌
Phase 4: Code Reorganization     ░░░░░░░░░░░░░░░░░░░░   0% ❌
Phase 5: Documentation           ████░░░░░░░░░░░░░░░░  20% 🚧
Phase 6: Testing & Verification  ██░░░░░░░░░░░░░░░░░░  10% 🚧
```

---

## PHASE 1: Database Schema Design & Supabase Configuration

### 1.1: Assess Supabase Configuration ✅ DONE
- ✅ Changed from pooled to direct connection
- ✅ Updated for Express server (not Vercel serverless)
- **File:** `drizzle.config.ts`

### 1.2: Housing Data Schema ✅ DONE
- ✅ Designed `housing_buildings` table with DCP Housing Database fields
- ✅ Designed `housing_demolitions` table
- ✅ Added comprehensive geography fields (NTA2020, census tracts, districts)
- ✅ Added DCP unit tracking (classAInit, classAProp, classANet, unitsCO)
- **File:** `server/lib/schema.ts` (lines 108-211)
- **Details:** See `REFACTOR_STATUS.md`

### 1.3: Capital Budget Schema ✅ DONE
- ✅ Designed `capital_projects` table with GeoJSON support
- ✅ Includes budget allocations (allocateTotal, commitTotal, spentTotal)
- ✅ Includes geospatial data (PostGIS GeoJSON geometry)
- **File:** `server/lib/schema.ts` (lines 234-272)

### 1.4: Financial Visualization Schema ✅ DONE
- ✅ Designed `sankey_datasets` table (budget flows, pension allocations)
- ✅ Designed `sunburst_datasets` table (revenue/expense hierarchies)
- ✅ Supports d3-sankey and d3-hierarchy formats
- **File:** `server/lib/schema.ts` (lines 277-335)

### 1.5: Comprehensive Drizzle Schema ✅ DONE
- ✅ Created unified schema with all tables
- ✅ Includes civic structure (scopes, nodes, edges, processes, subgraphs, overlays)
- ✅ Includes housing data (buildings, demolitions)
- ✅ Includes capital budget (projects)
- ✅ Includes financial visualizations (sankey, sunburst)
- **File:** `server/lib/schema.ts`

### 1.6: Database Migrations ⏳ IN PROGRESS
- ✅ Migration SQL created for housing tables
- ✅ Migration script created (`apply-housing-migration.js`)
- ⏳ Migration needs to be run by user (network access required)
- ⏳ Need to verify migration success
- **Files:**
  - `scripts/migrations/001_migrate_to_dcp_housing.sql`
  - `scripts/apply-housing-migration.js`
- **Command:** `npm run db:migrate-housing` or `npm run db:push`

---

## PHASE 2: Update Data Scripts & Seed Database

### 2.1: Revenue Sunburst Seed ✅ DONE
- ✅ Integrated into `seed-financial.js`
- ✅ Seeds to `sunburst_datasets` table
- **File:** `scripts/seed-financial.js`

### 2.2: Expense Sunburst Seed ✅ DONE
- ✅ Integrated into `seed-financial.js`
- ✅ Seeds to `sunburst_datasets` table
- **File:** `scripts/seed-financial.js`

### 2.3: Pension Sankey Seed ✅ DONE
- ✅ Integrated into `seed-financial.js`
- ✅ Seeds to `sankey_datasets` table
- **File:** `scripts/seed-financial.js`

### 2.4: Budget Sankey Seed ✅ DONE
- ✅ Integrated into `seed-financial.js`
- ✅ Seeds to `sankey_datasets` table
- **File:** `scripts/seed-financial.js`

### 2.5: Housing Data Seed ⚠️ NEEDS FIX
- ✅ Created seed script using DCP Housing Database
- ✅ Replaced DOB API with ArcGIS REST API
- ✅ Implements DCP primary + Housing NY overlay
- ⚠️ **CRITICAL BUG:** 430k units (should be ~150-200k)
- ⚠️ **Issue:** Using `Units_CO` instead of `classANet` for alterations
- **File:** `scripts/seed-housing.js`
- **Fix needed:** Line 100 - change to use `classANet` only
- **Details:** See `REFACTOR_STATUS.md` Issue #1

### 2.6: Capital Budget Seed ✅ DONE
- ✅ Created seed script for CPDB
- ✅ Processes GeoJSON features
- ✅ Seeds to `capital_projects` table
- **File:** `scripts/seed-capital-budget.js`

### 2.7: Run All Seed Scripts ⏳ PENDING
- ✅ Housing migration created (needs to be run)
- ⏳ Fix housing unit counting bug first
- ⏳ Run `npm run seed:housing` after fix
- ⏳ Run `npm run seed:capital`
- ⏳ Run `npm run seed:financial`
- ⏳ Verify all data loaded correctly

---

## PHASE 3: Migrate Data Flow from Serverless to Database

### 3.1: Housing Data Route ❌ NOT STARTED
- ❌ Update `/server/routes/housing-data.ts` to pull from database
- ❌ Replace NYC Open Data API calls with database queries
- ❌ Update to use new DCP Housing Database schema
- **Current:** Still fetching from NYC Open Data in real-time
- **Target:** Query `housing_buildings` and `housing_demolitions` tables

### 3.2: Capital Budget Route ❌ NOT STARTED
- ❌ Update `/server/routes/capital-budget.ts` to pull from database
- ❌ Replace NYC Open Data API calls with database queries
- **Current:** Still fetching from NYC Open Data in real-time
- **Target:** Query `capital_projects` table

### 3.3: Financial Data Route ❌ NOT STARTED
- ❌ Create new `/server/routes/financial-data.ts`
- ❌ Serve sankey data from `sankey_datasets` table
- ❌ Serve sunburst data from `sunburst_datasets` table
- **Current:** Pre-generated JSON files in `/public/data/`
- **Target:** Dynamic database queries

### 3.4: Update Frontend Components ❌ NOT STARTED
- ❌ Update housing components to use new API endpoints
- ❌ Update capital budget components to use new API endpoints
- ❌ Update financial visualization components to use new API endpoints
- **Files to update:**
  - `src/components/HousingTimelapse/Map3D.tsx`
  - `src/lib/housingDataProcessor.ts` (may deprecate)
  - Financial visualization components

### 3.5: Remove /api Directory ❌ NOT STARTED
- ❌ Delete `/api` directory (Vercel serverless functions)
- **Current:** Still contains Vercel serverless functions
- **Target:** Fully removed

### 3.6: Remove /public/data/*.json Files ❌ NOT STARTED
- ❌ Remove pre-generated financial JSON files
- ❌ Clean up `/public/data/` directory
- **Current:** Still contains static JSON files
- **Target:** Files removed, served from database

### 3.7: Update Vite Config ❌ NOT STARTED
- ❌ Remove Vercel-specific configurations from `vite.config.ts`
- **Current:** May have Vercel optimizations
- **Target:** Clean Express-only config

---

## PHASE 4: Code Reorganization & Refactoring

### 4.1: Split Cytoscape Controller ❌ NOT STARTED
- ❌ Split `controller.ts` (915 lines) into 4 modules:
  - `state-manager.ts`
  - `subview-operations.ts`
  - `styling-operations.ts`
  - `focus-operations.ts`
- **File:** `src/visualization/cytoscape/controller.ts`

### 4.2: Split Housing Data Processor ❌ NOT STARTED
- ❌ Split `housingDataProcessor.ts` (805 lines) into 3 modules:
  - `api-fetching.ts`
  - `data-transformation.ts`
  - `demolition-stats.ts`
- **File:** `src/lib/data/housingDataProcessor.ts`
- **Note:** May deprecate entirely if all processing moves to seed time

### 4.3: Split Sunburst Diagram ❌ NOT STARTED
- ❌ Split `SunburstDiagram.tsx` (421 lines) into 4 modules:
  - `layout-manager.ts`
  - `arc-generator.ts`
  - `interaction-handler.ts`
  - Simplified component
- **File:** `src/visualization/sunburst/SunburstDiagram.tsx`

### 4.4: Extract Shared Caching Logic ❌ NOT STARTED
- ❌ Create `/server/lib/cache.ts`
- ❌ Centralize caching logic from server routes

### 4.5: Create Visualization Constants ❌ NOT STARTED
- ❌ Create `/src/lib/constants/visualization.ts`
- ❌ Move magic numbers (PADDING, NODE_WIDTH, etc.)

### 4.6: Centralize Type Definitions ❌ NOT STARTED
- ❌ Create `/src/data/types.ts`
- ❌ Remove scattered type definitions

### 4.7: Create Error Handler ❌ NOT STARTED
- ❌ Create `/src/lib/error-handler.ts`
- ❌ Standardize error handling across app

### 4.8: Reorganize Folder Structure ❌ NOT STARTED
- ❌ Move `/server` to `/src/server` for monorepo organization
- ❌ Review overall folder structure

### 4.9: Review Unidirectional Flow ❌ NOT STARTED
- ❌ Ensure InputHandler → Controller → App flow is maintained
- ❌ Document data flow patterns

---

## PHASE 5: Documentation & Cleanup

### 5.1: Update README Architecture ❌ NOT STARTED
- ❌ Document new architecture (database-backed, no serverless)
- ❌ Update technology stack section

### 5.2: Update README Setup Instructions ❌ NOT STARTED
- ❌ Document database seeding process
- ❌ Update environment variables section
- ❌ Add migration instructions

### 5.3: Document Cron Job Path ⏳ IN PROGRESS
- ✅ Created `REFACTOR_STATUS.md` with housing details
- ⏳ Document recommended cron job setup for data seeding
- **Recommendation:** Weekly cron to run seed scripts

### 5.4: Remove Unused Dependencies ❌ NOT STARTED
- ❌ Audit `package.json`
- ❌ Remove Vercel-specific dependencies
- ❌ Remove unused packages

### 5.5: Update .env.example ⏳ IN PROGRESS
- ✅ `.env.example` exists with DATABASE_URL
- ⏳ Verify all required variables are documented
- **File:** `.env.example`

### 5.6: Create ARCHITECTURE.md ❌ NOT STARTED
- ❌ Document refactored structure
- ❌ Document data flow (seed → database → API → frontend)
- ❌ Document folder organization

---

## PHASE 6: Testing & Verification

### 6.1: Test Housing Data Loading ⏳ IN PROGRESS
- ⏳ Fix unit counting bug (430k → ~150-200k units)
- ⏳ Verify ~20-25% affordable ratio
- ⏳ Test database queries
- **Current:** Found critical bug, needs fix

### 6.2: Test Capital Budget Loading ❌ NOT STARTED
- ❌ Run seed script
- ❌ Verify data in database
- ❌ Test database queries

### 6.3: Test Financial Visualizations ❌ NOT STARTED
- ❌ Run seed script
- ❌ Verify sankey/sunburst data in database
- ❌ Test database queries

### 6.4: Verify InputHandler Flows ❌ NOT STARTED
- ❌ Test all InputHandler → Controller → App flows
- ❌ Ensure no regressions

### 6.5: Test Production Build ❌ NOT STARTED
- ❌ Run `npm run build`
- ❌ Verify all features work in production
- ❌ Test with production database

### 6.6: Create Final Commit ⏳ IN PROGRESS
- ✅ Commits for housing schema, seed, migrations
- ⏳ Final commit once all phases complete

### 6.7: Push to Remote ⏳ IN PROGRESS
- ✅ Pushed housing changes to branch
- ⏳ Final push once all phases complete

---

## 🚨 Critical Blockers

### Blocker #1: Housing Unit Counting Bug (PRIORITY 1)
**Status:** 🔴 Critical
**Issue:** Seed script reports 430k units instead of expected 150-200k

**Root Cause:**
```javascript
// Line 100 in scripts/seed-housing.js
const totalUnits = Math.round(unitsCO || classANet); // ⚠️ WRONG
```

**Problem:**
- `Units_CO` = Total units in ENTIRE building (e.g., 500 units)
- `classANet` = NET NEW units added (e.g., +20 units for alterations)
- For alterations, we're counting the full building instead of just the net change

**Fix:**
```javascript
// Should be:
const totalUnits = Math.round(classANet); // Use net change only
```

**Impact:** Blocks all housing data work (Phase 2.5, 2.7, 3.1, 6.1)

**Next Steps:**
1. Research DCP Housing Database docs to confirm field meanings
2. Apply fix to line 100
3. Re-run seed script
4. Verify totals are ~150-200k units

**Details:** See `REFACTOR_STATUS.md` for full investigation notes

### Blocker #2: Database Migration Not Applied
**Status:** 🟡 Moderate
**Issue:** User's database doesn't have new DCP Housing Database columns

**Fix:** User needs to run:
```bash
npm run db:push
# or
npm run db:migrate-housing
```

**Impact:** Blocks running seed script until migration applied

---

## 📋 Immediate Next Steps (Priority Order)

1. 🔴 **Fix housing unit counting bug** (Blocker #1)
   - Research `classANet` vs `Units_CO` in DCP docs
   - Update line 100 in `seed-housing.js`
   - Test with small sample

2. 🟡 **Apply database migration** (Blocker #2)
   - User runs `npm run db:push`
   - Verify all columns added

3. 🟢 **Run housing seed and verify**
   - Run `npm run seed:housing`
   - Check totals: ~150-200k units, ~20-25% affordable
   - Run `npm run verify:housing`

4. 🟢 **Test capital and financial seeds**
   - Run `npm run seed:capital`
   - Run `npm run seed:financial`
   - Verify data in database

5. 🟢 **Update backend routes (Phase 3)**
   - Start with housing-data.ts
   - Then capital-budget.ts
   - Then financial-data.ts

6. 🟢 **Update frontend components (Phase 3.4)**
   - Update to use new API endpoints
   - Test visualizations

7. 🟢 **Code reorganization (Phase 4)**
   - Split large files
   - Extract constants and utilities

8. 🟢 **Final documentation (Phase 5)**
   - Update README
   - Create ARCHITECTURE.md
   - Clean up dependencies

---

## 📊 Progress Tracking

### By Data Source
| Data Source | Schema | Seed Script | Backend Route | Frontend | Status |
|-------------|--------|-------------|---------------|----------|--------|
| Housing | ✅ 100% | ⚠️ 90% | ❌ 0% | ❌ 0% | **🚧 Blocked** |
| Capital | ✅ 100% | ✅ 100% | ❌ 0% | ❌ 0% | **🟢 Ready** |
| Financial | ✅ 100% | ✅ 100% | ❌ 0% | ❌ 0% | **🟢 Ready** |

### By Phase
| Phase | Tasks | Completed | In Progress | Not Started | % Complete |
|-------|-------|-----------|-------------|-------------|------------|
| 1 | 6 | 5 | 1 | 0 | 95% |
| 2 | 7 | 5 | 1 | 1 | 80% |
| 3 | 7 | 0 | 0 | 7 | 0% |
| 4 | 9 | 0 | 0 | 9 | 0% |
| 5 | 6 | 0 | 2 | 4 | 20% |
| 6 | 7 | 0 | 3 | 4 | 10% |

---

## 🎯 Success Criteria

The refactor will be complete when:

✅ **Phase 1:** All database schemas created and migrated
⏳ **Phase 2:** All seed scripts working and data verified
⏳ **Phase 3:** All backend routes pulling from database
⏳ **Phase 4:** Code reorganized and technical debt reduced
⏳ **Phase 5:** Documentation complete and up-to-date
⏳ **Phase 6:** All tests passing, production build works

**Final Deliverable:** Production-ready database-backed Express application with no Vercel dependencies

---

## 📚 Key Documents

- **`REFACTOR_PLAN.md`** (this file) - Master refactor plan
- **`REFACTOR_STATUS.md`** - Detailed housing migration status
- **`ARCHITECTURE.md`** - Architecture documentation (to be created)
- **`README.md`** - User-facing documentation (to be updated)

---

## 📞 Open Questions

1. **Housing unit counting:** Confirm `classANet` is correct field for totalUnits?
2. **Time range:** Use completion year or permit year for filtering?
3. **Job status:** Should we filter by specific job statuses?
4. **Affordable merging:** Confirm DCP totalUnits INCLUDES affordable units?
5. **Cron schedule:** How often to refresh housing/capital/financial data?

---

**Last Updated:** 2025-11-11
**Current Focus:** Fix housing unit counting bug, then complete Phase 2 & 3
**Overall Status:** 🟡 In Progress - 45% Complete
