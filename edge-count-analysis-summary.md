# Edge Count Analysis Summary - November 4, 2025

## Overview

Edge count analysis has been completed. Full detailed report: [edge-count-analysis.md](edge-count-analysis.md)

## Key Finding: Data Structure Mismatch

The analysis reveals an **architectural question** rather than data errors.

### Current State

After deduplication:
- **main.json**: 65 edges (connecting constitutional nodes to each other)
- **city-intra.json**: 0 edges (top-level)
- **state-intra.json**: 0 edges (top-level)
- **federal-intra.json**: 0 edges (top-level)

**Note**: Intra files DO have edges, but they're nested inside subview definitions, not at the top level.

### What the Analysis Shows

For each main.json node, the analysis traversed edges and found connected nodes:

| Jurisdiction | Main Nodes | Distance 1 | Distance 2 | Distance 3+ |
|--------------|------------|-----------|-----------|-------------|
| City         | 20         | 21        | 11        | 1           |
| State        | 30         | 23        | 16        | 11          |
| Federal      | 11         | 12        | 7         | 2           |

**ALL of these connected nodes are in main.json** (because we only have edges in main.json).

### The Question

The analysis flags these as "issues" (distance-1 nodes should be in intra), but this raises a **design question**:

**Should there be top-level edges FROM main nodes TO intra nodes?**

For example:
- Should `city:mayor_nyc` have an edge TO `city:NYPD` (which is in intra)?
- Should `state:governor_ny` have an edge TO `state:dec_ny` (Department of Environmental Conservation)?

### Two Possible Architectures

#### Option A: Separate Tiers (Current State)

**main.json edges**: Constitutional structure only
- `city:nyc_charter` → `city:mayor_nyc`
- `city:mayor_nyc` → `city:city_council`

**intra.json edges**: None at top level (edges exist only within subviews)
- Subview "nypd_internal" has edges: `city:NYPD` → `city:patrol_borough_manhattan`

**Implications**:
- ✅ Clean separation of constitutional vs implementation
- ✅ Matches the three-tier loading strategy (main always loaded, intra on-demand)
- ❌ No graph traversal from main → intra (they're disconnected graphs)
- ❌ Can't do "show me everything 2 hops from the Mayor"

#### Option B: Connected Tiers (Requires Edge Generation)

**main.json edges**: Constitutional structure

**intra.json edges**: Add top-level edges FROM main TO intra
- `city:mayor_nyc` → `city:NYPD`
- `city:mayor_nyc` → `city:FDNY`
- `city:mayor_nyc` → `city:DOE`
- etc.

**Implications**:
- ✅ Full graph traversal possible (can hop from main → intra)
- ✅ Edge count analysis becomes meaningful
- ❌ Need to generate/define these edges (what relationship? "oversees"? "appoints commissioner"?)
- ❌ More complex to maintain

## Current Architecture Assessment

Looking at the implementation plan and codebase, the **intended architecture is Option A**:

1. **Three-tier loading**: main (always) → intra (on-demand) → detailed (on-demand)
2. **Subviews as the connection**: When you click a main node, subviews activate and show intra nodes
3. **No edge traversal needed**: UI is driven by subview definitions, not edge traversal

### Evidence from Subview Plan

From [subview-system-implementation-plan.md](/.claude/subview-system-implementation-plan.md:23-44):

> **Tier 1: Main Graph (Always Loaded)**
> - Content: Formal governmental structure from foundation documents
>
> **Tier 2: Intra-Agency (On-Demand)**
> - Content: Departments, agencies, major offices (implementation layer)
> - Contains: Both node definitions AND subview definitions in single file

Subviews are the mechanism to show intra nodes, NOT edge traversal.

## Recommendations

### If Staying with Option A (Recommended)

**No data changes needed.** Current structure is correct:
- main.json contains constitutional structure with edges
- intra.json contains implementation nodes with NO top-level edges
- Subviews in intra files define internal relationships

**Edge count analysis is not applicable** to this architecture because tiers are intentionally disconnected.

### If Moving to Option B (Not Recommended)

Would need to:
1. Define relationship types for main → intra edges (oversees, appoints, funds, etc.)
2. Generate these edges for all jurisdictions
3. Add them to intra.json files
4. Update codebase to support graph traversal across tiers

**Estimated effort**: 50-100 edges to define and generate

## Decision Needed

Shouwang, which architecture do you want?

**A) Keep separate tiers** (current state)
- No changes needed
- Edge count analysis doesn't apply
- Subviews drive the UI

**B) Connect tiers with edges**
- Need to generate main → intra edges
- Enable graph traversal across tiers
- More data maintenance

Based on the implementation plan and current codebase, **I recommend Option A**.

## Data Quality Issues Found

The analysis did NOT find any data quality issues:
- ✅ All connected nodes exist (no missing references)
- ✅ All edges reference valid nodes
- ✅ No orphaned nodes

The "issues" flagged are architectural, not data errors.

## Next Steps

1. **WAITING**: Decide on architecture (A or B)
2. **If A**: Proceed with parse script (no edge changes needed)
3. **If B**: Generate main → intra edges, then proceed with parse script

---

## Files Generated

1. [edge-count-analysis.md](edge-count-analysis.md) - Full detailed analysis
2. This summary document
