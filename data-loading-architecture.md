# Data Loading Architecture

## How the System Loads and Displays Data

### 1. Data Loading (Module Initialization)

**File: [src/data/datasets.ts](src/data/datasets.ts)**

At module load time, the system:
1. Imports ALL JSON files:
   - `data/main.json` (main tier nodes + main edges)
   - `data/city-intra.json` (intra tier nodes + intra edges + subviews)
   - `data/state-intra.json` (intra tier nodes + intra edges + subviews)
   - `data/federal-intra.json` (intra tier nodes + intra edges + subviews)
   - Process files (unchanged)

2. Merges data for each jurisdiction (lines 60-97):
   ```typescript
   nodes: [...annotatedMainNodes, ...annotatedIntraNodes]
   ```
   Each dataset contains BOTH main and intra nodes.

3. Creates unified dataset (lines 87-148 in [unifiedDataset.ts](src/data/unifiedDataset.ts)):
   - Combines all jurisdictions
   - Creates anchor nodes and anchor edges
   - **IMPORTANT**: Anchor edges are created for ALL nodes (main + intra)

### 2. Main Graph Building (Startup)

**File: [src/data/graphDataPipeline.ts](src/data/graphDataPipeline.ts:74-81)**

```typescript
// Filter to only main tier nodes (default view)
const mainTierNodes = dataset.nodes.filter(node =>
  node.tier === 'main' || node.tier === undefined
);

const mainGraph = buildMainGraph(
  { meta: dataset.meta, nodes: mainTierNodes },
  { edges: dataset.edges }  // ⚠️ BUT edges include anchor edges to intra nodes!
);
```

**This is the bug!** The main graph gets ALL edges (including anchor edges that point to intra nodes), but only MAIN tier nodes. So we have edges pointing to non-existent nodes.

### 3. Subview Loading

**File: [src/graph/subviews.ts](src/graph/subviews.ts:81-100)**

When loading subviews:
```typescript
// Collect all nodes for lookups
const allNodes: StructureNode[] = Object.values(datasets).flatMap(d => d.nodes);

// For each subview, look up nodes from allNodes
for (const subview of dataset.subviews) {
  const config = subviewToSubgraphConfig(subview, allNodes);
}
```

**Key insight**: Subviews CAN reference nodes from different files because `allNodes` contains everything.

### 4. Subview Activation (Runtime)

**File: [src/graph/subgraph-controller.ts](src/graph/subgraph-controller.ts:86-114)**

When activating a subview:
```typescript
cy.batch(() => {
  subgraph.nodes.forEach((node) => {
    if (existingNodeIds.has(node.id)) {
      return;  // Skip if already in graph
    }

    cy.add({  // Add node if not present
      group: 'nodes',
      data: node,
    });
    addedNodeIds.add(node.id);
  });

  // Add edges...
});
```

**Key insight**: The subgraph controller ADDS nodes to the graph on-demand if they don't exist. So cross-file references work at runtime!

### 5. Process Display (Runtime)

**File: [src/graph/process-controller.ts](src/graph/process-controller.ts:78-106)**

Similar to subgraphs - looks up nodes from `nodesById` index and adds them if missing.

## Current Problem

### The Bug

**Location**: [unifiedDataset.ts:62-70](src/data/unifiedDataset.ts#L62-L70)

```typescript
const attachEdges = dataset.nodes.map((node) => ({
  source: group.anchorId,
  target: node.id,  // ⚠️ Creates edges to BOTH main and intra nodes
  // ...
}));
```

This creates anchor edges to ALL nodes (main + intra), but the main graph only contains main tier nodes.

**Error**: `Can not create edge federal-group-anchor-federal:state with nonexistant target federal:state`

- `federal:state` is an intra node (exists in federal-intra.json)
- An anchor edge was created pointing to it
- But it's not in mainGraph (filtered out as intra tier)
- Cytoscape throws error: can't create edge to non-existent node

### Why Subviews Would Work (But Don't Currently)

Looking at the migration script output, subviews like `federal:federal_agencies` were moved to main.json and reference nodes like `federal:state`. This SHOULD work because:

1. The subgraph controller loads node data on-demand (line 92-96 in subgraph-controller.ts)
2. All nodes are available in `allNodes` lookup (line 85 in subviews.ts)
3. Missing nodes are added to the graph when the subview activates

**However**: The error happens BEFORE subview activation - it happens when initializing the main graph because of the bogus anchor edges.

## Solution Options

### Option 1: Filter Anchor Edges (Recommended)

Only create anchor edges for main tier nodes.

**File to fix**: [unifiedDataset.ts:62-70](src/data/unifiedDataset.ts#L62-L70)

```typescript
const attachEdges = dataset.nodes
  .filter(node => node.tier === 'main' || node.tier === undefined)  // ✅ Only main nodes
  .map((node) => ({
    source: group.anchorId,
    target: node.id,
    // ...
  }));
```

**Pros**:
- Minimal change
- Fixes the immediate bug
- Subviews can still reference cross-file nodes (they're loaded on-demand)
- Anchor edges only for nodes that exist in main graph

**Cons**:
- None

### Option 2: Keep Subviews in Intra Files

Revert the migration - move `city:departments`, `state:state_agencies`, etc. back to intra files.

**Pros**:
- Avoids cross-file references entirely
- All nodes in a subview are in the same file

**Cons**:
- Violates the "subviews live with their anchor" principle
- Requires reverting migration work
- Doesn't fix the underlying anchor edge bug

## Architecture Decision

The current architecture **fully supports** subviews referencing nodes from other files:
- All nodes are loaded at startup
- Subgraph controller adds missing nodes on-demand
- Process controller does the same

Therefore:
1. **Keep the migration** - subviews in main.json referencing intra nodes is architecturally sound
2. **Fix the anchor edge bug** - filter to only create anchor edges for main tier nodes
3. **Leave cross-file references** - they work correctly at runtime

## Recommendation

Apply Option 1: Filter anchor edges to only main tier nodes. This is a 1-line fix that resolves the bug while keeping the migration intact.
