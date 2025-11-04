# Data Structure Analysis - November 4, 2025

## Executive Summary

**Current State**: The data has significant duplication and format inconsistencies that need to be resolved before implementing the subview system.

**Key Issues**:
1. Node duplication between main.json and intra files (38 total duplicates)
2. Subgraphs use old non-prefixed node IDs (incompatible with new format)
3. Processes use old non-prefixed node IDs (incompatible with new format)
4. Unknown nodes referenced in processes that may not exist in main/intra files

## Architecture Verification

### Codebase Support for Subview System

**✅ SUPPORTED** - The codebase already has infrastructure for the three-tier subview system:

1. **Type Definitions** ([src/data/types.ts](src/data/types.ts)):
   - `SubviewDefinition` type defined with proper structure
   - `tier: 'main' | 'intra' | 'detailed'` property on StructureNode
   - Edge relation taxonomy defined

2. **Data Loading** ([src/data/datasets.ts](src/data/datasets.ts:1-131)):
   - Already loads main.json and jurisdiction-specific intra files
   - Merges main + intra nodes with proper tier annotations
   - Supports `subviews` property in datasets

3. **Graph Pipeline** ([src/data/graphDataPipeline.ts](src/data/graphDataPipeline.ts:74-76)):
   - Filters nodes by tier (main vs intra)
   - Builds indexes for node lookups
   - Supports subview configs

4. **Subview Processing** ([src/graph/subviews.ts](src/graph/subviews.ts)):
   - Converts SubviewDefinition to SubgraphConfig
   - Builds subview configs from all jurisdictions

**Conclusion**: The codebase can support the three-tier architecture with minimal changes. The main work is data cleanup and restructuring.

---

## Current Data Files

### Main Files

| File | Size | Nodes | Edges | Notes |
|------|------|-------|-------|-------|
| main.json | 24KB | 61 | 65 | Source of truth, uses prefixed IDs |
| city-intra.json | 53KB | 113 | 15 | Has 11 subviews defined |
| state-intra.json | 51KB | 106 | 23 | Has 11 subviews defined |
| federal-intra.json | 39KB | 80 | 7 | Has 9 subviews defined |

### Process Files

| File | Size | Processes | Status |
|------|------|-----------|--------|
| city-processes.json | 9.5KB | Multiple | ⚠️ Uses non-prefixed IDs |
| state-processes.json | 8.0KB | Multiple | ⚠️ Uses non-prefixed IDs |
| federal-processes.json | 4.7KB | Multiple | ⚠️ Uses non-prefixed IDs |

### Subgraph Files (Old Format)

| File | Nodes | Edges | Status |
|------|-------|-------|--------|
| city-departments.json | 44 | 85 | ⚠️ Uses non-prefixed IDs |
| state-agencies.json | TBD | TBD | ⚠️ Uses non-prefixed IDs |
| state-courts.json | TBD | TBD | ⚠️ Uses non-prefixed IDs |
| federal-agencies.json | TBD | TBD | ⚠️ Uses non-prefixed IDs |

### Deprecated Files (Should be deleted)

- city.json (2.4KB) - Superseded by main.json city nodes
- state.json (848B) - Superseded by main.json state nodes
- federal.json (2.7KB) - Superseded by main.json federal nodes

---

## Node Distribution

### main.json Breakdown

| Jurisdiction | Node Count | Percentage |
|--------------|------------|------------|
| City (city:*) | 20 | 33% |
| State (state:*) | 30 | 49% |
| Federal (federal:*) | 11 | 18% |
| **Total** | **61** | **100%** |

### Intra Files Breakdown

| Jurisdiction | Nodes | Edges | Subviews |
|--------------|-------|-------|----------|
| City | 113 | 15 | 11 |
| State | 106 | 23 | 11 |
| Federal | 80 | 7 | 9 |
| **Total** | **299** | **45** | **31** |

---

## Critical Issue: Node Duplication

### Nodes Appearing in BOTH main.json and Intra Files

**City (14 duplicates)**:
- city:borough_structure
- city:bp_bronx
- city:bp_brooklyn
- city:bp_manhattan
- city:bp_queens
- city:bp_staten_island
- city:cb_bronx
- city:cb_brooklyn
- city:cb_manhattan
- city:cb_queens
- city:cb_staten_island
- city:departments
- city:nyc_budget
- city:rules_of_city

**State (19 duplicates)**: (Count verified, list needs extraction)

**Federal (5 duplicates)**: (Count verified, list needs extraction)

**Total Duplicates**: 38 nodes

**Impact**: This duplication means:
1. When the codebase loads data, it gets duplicate nodes
2. The datasets.ts merge creates nodes with the same ID twice
3. Graph rendering may have undefined behavior
4. Data integrity is compromised

**Recommendation**: Nodes should exist in ONLY ONE FILE:
- If it's a top-level constitutional structure → main.json
- If it's an implementing agency/department → intra.json
- If it's internal org structure → intra-detailed/

---

## Data Format Incompatibilities

### Issue 1: Subgraphs Use Non-Prefixed IDs

**Example from city-departments.json**:
```json
{
  "id": "departments",
  "entryNodeId": "departments",  // ❌ Should be "city:departments"
  "elements": {
    "nodes": [
      { "data": { "id": "mayor_nyc" } },  // ❌ Should be "city:mayor_nyc"
      { "data": { "id": "NYPD" } }        // ❌ Should be "city:NYPD"
    ]
  }
}
```

**Impact**: These subgraphs cannot reference nodes in main.json or intra files because the IDs don't match.

### Issue 2: Processes Use Non-Prefixed IDs

**Example from city-processes.json**:
```json
{
  "id": "ulurp",
  "nodes": ["DCP", "community_boards", "mayor_nyc"],  // ❌ Missing "city:" prefix
  "edges": [
    { "source": "DCP", "target": "community_boards" }  // ❌ Missing prefixes
  ]
}
```

**Nodes Referenced in city-processes.json** (without prefixes):
- DCP
- MOCS
- OMB
- administrative_code
- borough_presidents
- charter_revision_commission
- city_council
- city_council_member
- community_boards
- comptroller
- departments
- mayor_nyc
- mayor_office_operations
- public
- rules_of_city
- vendors
- voters

**Impact**: Process flows cannot work with the current data model because node IDs don't match.

---

## Edge Count Analysis (INCOMPLETE)

**Note**: This section requires graph traversal analysis to count edges by nesting level. Due to the current data inconsistencies and duplication, accurate edge counts cannot be computed until data is cleaned.

### Methodology Needed

For each main.json node:
1. Find all nodes 1 edge away → Count for "intra"
2. Find all nodes 2 edges away → Count for "detailed"
3. Find all nodes 3+ edges away → Count for "further nested"

**Example format (hypothetical)**:
```
city:mayor_nyc - intra: 15 - detailed: 42 - further: 8
city:city_council - intra: 12 - detailed: 35 - further: 0
state:governor - intra: 18 - detailed: 53 - further: 12
```

**Status**: ⏸️ BLOCKED - Cannot compute until duplication is resolved

---

## Recommended Next Steps

### Before Creating Parse Script

1. **Resolve Duplication**: Decide which nodes belong in main vs intra
   - Review the 38 duplicate nodes
   - Move nodes to correct file (main or intra)
   - Delete from the other file

2. **Fix Node ID Prefixes**:
   - Update all subgraphs to use prefixed IDs (city:, state:, federal:)
   - Update all processes to use prefixed IDs
   - Verify all references are valid

3. **Verify Node References**:
   - Check that all nodes referenced in processes exist in main/intra
   - Check that all nodes referenced in subgraphs exist in main/intra
   - Generate list of missing nodes that need to be created

4. **Compute Edge Counts**:
   - After duplication is resolved, run graph traversal
   - Generate edge count analysis per main node
   - This will inform what should go in intra vs intra-detailed

### Only After Data is Clean

5. **Create Parse Script**: Script to generate the 10 output files:
   - 1 × main.json (already exists, may need deduplication)
   - 3 × {jurisdiction}-intra.json (exist, need deduplication)
   - 3 × {jurisdiction}-intra-detailed/ (need to be created)
   - 3 × {jurisdiction}-processes.json (exist, need ID fixes)

---

## Questions for Shouwang

1. **Duplication Resolution**: For the 38 duplicate nodes, should we:
   - Keep in main.json (if constitutional/charter-defined)?
   - Move to intra.json (if implementation detail)?
   - I need guidance on specific nodes, especially borough structure

2. **Borough Structure**: You mentioned we might not want subviews for borough structure. Should these stay in main, move to intra, or be handled differently?

3. **Missing Nodes**: Many nodes referenced in processes don't exist in current main/intra files (e.g., "community_boards", "voters", "public"). Should we:
   - Generate these nodes in the appropriate file?
   - Remove them from processes?
   - Create a mapping from old IDs to new IDs?

4. **Subgraphs vs Intra Subviews**: The subgraphs/ directory has old-format subviews. The intra files have new-format subviews. Should we:
   - Convert subgraphs to new format and merge into intra files?
   - Keep both for now?
   - Deprecate subgraphs entirely?

---

## File Backups

✅ **Backups Created**: All data files backed up to `data/backup-2025-11-04/`
✅ **.gitignore Updated**: `data/backup-*` added to .gitignore

---

## Next Action

**WAITING FOR REVIEW** - Please review this analysis and provide guidance on:
1. Which duplicate nodes should stay in main vs move to intra
2. How to handle borough structure
3. How to handle missing nodes referenced in processes
4. Whether to convert/merge subgraphs or keep separate

After your review, I can:
1. Create a deduplication script
2. Create an ID prefix migration script for processes/subgraphs
3. Generate missing nodes
4. Compute edge counts
5. Create the final parse script
