# Seed Script Issues Found

## Critical Issues

### 1. **Expense Sunburst - Missing Object Class Level**
**Original** (fetch-expense-sunburst.js):
- 3-level hierarchy: Category → Agency → Object Class
- Normalizes object class names (e.g., "FULL TIME SALARIED" → "Full-Time Salaries")
- Handles negative values with `actualValue` and `isNegative` fields
- Uses `toTitleCase()` for display names

**Current** (seed-financial.js):
- 2-level hierarchy: Category → Agency (with value)
- ❌ **Missing entire Object Class level**
- ❌ **No name normalization**
- ❌ **No negative value handling**

### 2. **Revenue Sunburst - Missing Top Level and Class**
**Original** (fetch-revenue-sunburst.js):
- 4-level hierarchy: Top Level → Category → Class → Source
- Top level grouping via `getTopLevelCategory()` function
- Special handling for "Taxes" to avoid duplication
- Uses `revenue_class_name` field (we're not using this at all!)
- Handles negative values

**Current** (seed-financial.js):
- 2-level hierarchy: Category → Source
- ❌ **Missing Top Level grouping**
- ❌ **Missing Class level (revenue_class_name)**
- ❌ **No special Taxes handling**
- ❌ **No negative value handling**

### 3. **Budget Sankey - Different Structure**
**Original** (generate-budget-sankey.js):
- Structure appears correct after recent fixes
- ✅ Uses separate funding source columns
- ✅ Aggregates by agency then builds sankey

**Current** (seed-financial.js):
- ✅ Now matches original structure

## Required Fixes

### Fix 1: Expense Sunburst
Need to add:
1. Third level for Object Class (`object_class_name` field)
2. Object class name normalization mapping
3. `toTitleCase()` function for display names
4. Negative value handling (`actualValue`, `isNegative` fields)
5. Build proper 3-level hierarchy

### Fix 2: Revenue Sunburst
Need to add:
1. `getTopLevelCategory()` function to group categories
2. Use `revenue_class_name` field for Class level
3. Build proper 4-level hierarchy (or 3-level for Taxes special case)
4. Negative value handling
5. `toTitleCase()` function

## Non-Critical Issues

### Housing Data
- Processing logic looks good
- BBL normalization matches original
- Unit aggregation matches original
- Need to verify DOB job type filtering logic

### Capital Budget
- Appears to match original route logic
- GeoJSON handling looks correct
- Data correction for 100 billion bug is present

## Action Items

1. [ ] Copy helper functions from originals (`toTitleCase`, `normalizeObjectClass`, `getTopLevelCategory`)
2. [ ] Rewrite expense sunburst to 3-level hierarchy
3. [ ] Rewrite revenue sunburst to 4-level hierarchy with special Taxes handling
4. [ ] Add negative value handling to both
5. [ ] Test with actual data to ensure output matches
