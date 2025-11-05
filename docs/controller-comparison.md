# Controller Comparison Analysis

## Overview
Detailed line-by-line comparison of ProcessController vs SubgraphController to identify shared patterns and divergent logic.

---

## State Variables

### ProcessController (lines 44-45)
```typescript
let activeProcess: ActiveProcessState | null = null;
let processTransitionInProgress = false;
```

### SubgraphController (lines 41-44)
```typescript
let activeSubgraph: ActiveSubgraph | null = null;
let transitionInProgress = false;
const addedNodeIds = new Set<string>();
const addedEdgeIds = new Set<string>();
```

**Difference**:
- ProcessController tracks added elements inside ActiveProcessState
- SubgraphController tracks them as separate module-level variables
- **Decision**: Use ProcessController pattern (cleaner, state is self-contained)

---

## isActive() Method

### ProcessController (lines 47-52)
```typescript
const isActive = (id?: string): boolean => {
  if (!activeProcess) {
    return false;
  }
  return id ? activeProcess.id === id : true;
};
```

### SubgraphController (lines 46-51)
```typescript
const isActive = (id?: string): boolean => {
  if (!activeSubgraph) {
    return false;
  }
  return id ? activeSubgraph.id === id : true;
};
```

**Identical logic** ✅ - Only difference is variable name

---

## getActiveId() Method

### ProcessController
❌ Not implemented

### SubgraphController (line 53)
```typescript
const getActiveId = (): string | null => activeSubgraph?.id ?? null;
```

**Decision**: Include in unified controller (useful for debugging)

---

## Activation Logic: Guard Checks

### ProcessController show() (lines 59-66)
```typescript
if (processTransitionInProgress) {
  return;
}

if (activeProcess?.id === process.id) {
  return;
}

await clear();
```

### SubgraphController activate() (lines 59-69)
```typescript
if (transitionInProgress) {
  return;
}

if (activeSubgraph?.id === meta.id) {
  return;
}

if (activeSubgraph) {
  await restore();
}
```

**Identical pattern** ✅
1. Check transition lock
2. Check duplicate activation
3. Clear previous state

---

## Activation Logic: Setting Transition Lock

### ProcessController (line 69)
```typescript
processTransitionInProgress = true;
```

### SubgraphController (line 71)
```typescript
transitionInProgress = true;
```

**Identical** ✅

---

## Activation Logic: Adding Nodes

### ProcessController (lines 71-93)
```typescript
const tempNodeIds = new Set<string>();
const tempEdgeIds = new Set<string>();

const nodeIdSet = new Set(nodeInfos.map((node) => node.id));
const edgeIdSet = new Set(edgeInfos.map((edge) => edge.id));
const { centerX, centerY } = getViewportMetrics(cy);

cy.batch(() => {
  nodeInfos.forEach((nodeInfo) => {
    const existing = cy.getElementById(nodeInfo.id);
    if (existing.length > 0) {
      return;
    }
    const added = cy.add({
      group: 'nodes',
      data: nodeInfo,
      position: { x: centerX, y: centerY },
    });
    tempNodeIds.add(nodeInfo.id);
    added.removeData('orgPos');
    added.removeScratch('_positions');
    added.unlock();
  });
```

### SubgraphController (lines 73-89)
```typescript
const existingNodeIds = new Set(cy.nodes().map((node) => node.id()));

cy.batch(() => {
  subgraph.nodes.forEach((node) => {
    if (existingNodeIds.has(node.id)) {
      return;
    }

    const added = cy.add({
      group: 'nodes',
      data: node,
    });
    addedNodeIds.add(node.id);
    added.removeData('orgPos');
    added.removeScratch('_positions');
    added.unlock();
  });
```

**Mostly identical** ✅
- Both use cy.batch()
- Both check for existing nodes
- Both track added node IDs
- Both remove orgPos and _positions
- **Difference**: ProcessController sets initial position to viewport center

---

## Activation Logic: Adding Edges

### ProcessController (lines 95-106)
```typescript
edgeInfos.forEach((edgeInfo) => {
  const existing = cy.getElementById(edgeInfo.id);
  if (existing.length > 0) {
    return;
  }
  cy.add({
    group: 'edges',
    data: edgeInfo,
  });
  tempEdgeIds.add(edgeInfo.id);
});
```

### SubgraphController (lines 91-103)
```typescript
subgraph.edges.forEach((edge) => {
  const existingEdge = cy.getElementById(edge.id);
  if (existingEdge.length > 0) {
    return;
  }

  cy.add({
    group: 'edges',
    data: edge,
  });
  addedEdgeIds.add(edge.id);
});
```

**Identical logic** ✅

---

## Activation Logic: Collecting Elements

### ProcessController (lines 108-116)
```typescript
const processNodes = cy.nodes().filter((node) => nodeIdSet.has(node.id()));
const processEdges = cy.collection();
edgeInfos.forEach((edge) => {
  const cyEdge = cy.getElementById(edge.id);
  if (cyEdge && cyEdge.length > 0) {
    processEdges.merge(cyEdge);
  }
});
```

### SubgraphController (lines 105-113)
```typescript
const subgraphNodeIds = new Set(subgraph.nodes.map((node) => node.id));
const subNodes = cy.nodes().filter((node) => subgraphNodeIds.has(node.id()));
const subEdges = cy.collection();
subgraph.edges.forEach((edge) => {
  const cyEdge = cy.getElementById(edge.id);
  if (cyEdge && cyEdge.length > 0) {
    subEdges.merge(cyEdge);
  }
});
```

**Identical pattern** ✅

---

## Activation Logic: Applying CSS Classes

### ProcessController (line 117)
```typescript
applyProcessHighlightClasses(cy, nodeIdSet, edgeIdSet);
```

### SubgraphController (lines 114-123)
```typescript
const otherNodes = cy.nodes().not(subNodes);
const otherEdges = cy.edges().not(subEdges);

cy.batch(() => {
  cy.elements().removeClass('highlighted faded hidden dimmed');
  subNodes.addClass('highlighted');
  subEdges.addClass('highlighted');
  otherNodes.addClass('faded');
  otherEdges.addClass('hidden');
});
```

**DIFFERENT** ❌
- ProcessController: Uses external function `applyProcessHighlightClasses()`
  - Active: `process-active`, `process-active-edge`
  - Inactive: `dimmed`
- SubgraphController: Inline logic
  - Active: `highlighted`
  - Inactive: `faded` (nodes), `hidden` (edges)

**Decision**: Conditional logic based on `subview.type === 'workflow'`

---

## Activation Logic: Layout

### ProcessController (lines 119-125)
```typescript
const layoutOptions = createProcessLayoutOptions(centerX, centerY, ANIMATION_DURATION, ANIMATION_EASING);

const layoutElements = processNodes.union(processEdges);
const layout = layoutElements.layout(layoutOptions);
const layoutPromise = layout.promiseOn('layoutstop');
layout.run();
await layoutPromise;
```

### SubgraphController (lines 125-144)
```typescript
const entryNode = cy.getElementById(meta.entryNodeId);
const entryPos = entryNode.position();

const layoutOptions = cloneLayoutOptions(subgraph.layout, {
  animate: true,
  animationDuration: ANIMATION_DURATION,
  animationEasing: ANIMATION_EASING,
  fit: true,
  padding: 80,
  transform: (_node: any, pos: { x: number; y: number }) => ({
    x: pos.x + entryPos.x,
    y: pos.y + entryPos.y,
  }),
});
const layoutElements = subNodes.union(subEdges);

const layout = layoutElements.layout(layoutOptions);
const layoutPromise = layout.promiseOn('layoutstop');
layout.run();
await layoutPromise;
```

**Different approaches** ❌
- ProcessController: Uses `createProcessLayoutOptions()` (radial layout around viewport center)
- SubgraphController: Uses `cloneLayoutOptions()` from subgraph.layout, transforms relative to entry node

**Decision**:
- For workflows: Use process layout (viewport-centered radial)
- For others: Use SubviewDefinition.layout config with entry node transform

---

## Activation Logic: Fit Animation

### ProcessController (lines 127-140)
```typescript
if (processNodes.length > 0) {
  await cy
    .animation({
      fit: {
        eles: processNodes,
        padding: 140,
      },
      duration: ANIMATION_DURATION,
      easing: ANIMATION_EASING,
    })
    .play()
    .promise()
    .catch(() => {});
}
```

### SubgraphController (lines 146-157)
```typescript
await cy
  .animation({
    fit: {
      eles: subNodes,
      padding: 200,
    },
    duration: ANIMATION_DURATION,
    easing: ANIMATION_EASING,
  })
  .play()
  .promise()
  .catch(() => {});
```

**Nearly identical** ✅
- Only difference: padding (140 vs 200)
- ProcessController has length check (defensive)

**Decision**: Use padding 140 for workflows, 200 for others

---

## Activation Logic: Store State

### ProcessController (lines 142-149)
```typescript
activeProcess = {
  id: process.id,
  tempNodeIds,
  tempEdgeIds,
  nodeIds: nodeIdSet,
  edgeIds: edgeIdSet,
};

processTransitionInProgress = false;
```

### SubgraphController (lines 159-165)
```typescript
activeSubgraph = {
  id: meta.id,
  entryNodeId: meta.entryNodeId,
  graph: subgraph,
};

transitionInProgress = false;
```

**Different state structures** ❌
- ProcessController: Stores node/edge ID sets
- SubgraphController: Stores original graph config and entry node

**Decision**: Store what we need:
```typescript
{
  id: string;
  type: SubviewType;
  addedNodeIds: Set<string>;
  addedEdgeIds: Set<string>;
  affectedNodeIds: Set<string>;
  affectedEdgeIds: Set<string>;
}
```

---

## Deactivation Logic: Guard Checks

### ProcessController clear() (lines 154-158)
```typescript
const currentProcess = activeProcess;
if (!currentProcess || processTransitionInProgress) {
  return;
}

processTransitionInProgress = true;
```

### SubgraphController restore() (lines 169-176)
```typescript
if (!activeSubgraph) {
  return;
}
if (transitionInProgress) {
  return;
}

transitionInProgress = true;
```

**Identical pattern** ✅

---

## Deactivation Logic: Remove CSS Classes

### ProcessController (lines 161-164)
```typescript
cy.batch(() => {
  cy.nodes().removeClass('process-active dimmed');
  cy.edges().removeClass('process-active-edge dimmed');
});
```

### SubgraphController (line 215)
```typescript
resetHighlightClasses(cy);
```

**Different but equivalent** ~
- ProcessController: Explicit workflow classes
- SubgraphController: Uses utility function that removes all classes

**Decision**: Remove all classes (both patterns) based on subview type

---

## Deactivation Logic: Remove Added Elements

### ProcessController (lines 166-186)
```typescript
if (currentProcess.tempEdgeIds.size > 0) {
  const edgesToRemove = cy.collection();
  currentProcess.tempEdgeIds.forEach((id) => {
    const edge = cy.getElementById(id);
    if (edge.length > 0) {
      edgesToRemove.merge(edge);
    }
  });
  edgesToRemove.remove();
}

if (currentProcess.tempNodeIds.size > 0) {
  const nodesToRemove = cy.collection();
  currentProcess.tempNodeIds.forEach((id) => {
    const node = cy.getElementById(id);
    if (node.length > 0) {
      nodesToRemove.merge(node);
    }
  });
  nodesToRemove.remove();
}
```

### SubgraphController (lines 178-202)
```typescript
const removeAddedElements = () => {
  cy.batch(() => {
    const nodesToRemove = cy.collection();
    addedNodeIds.forEach((id) => {
      const node = cy.getElementById(id);
      if (node.length > 0) {
        nodesToRemove.merge(node);
      }
    });

    const edgesToRemove = cy.collection();
    addedEdgeIds.forEach((id) => {
      const edge = cy.getElementById(id);
      if (edge.length > 0) {
        edgesToRemove.merge(edge);
      }
    });

    edgesToRemove.remove();
    nodesToRemove.remove();
  });

  addedNodeIds.clear();
  addedEdgeIds.clear();
};

removeAddedElements();
```

**Identical logic, different organization** ✅
- SubgraphController uses helper function and wraps in batch
- SubgraphController clears the ID sets

**Decision**: Use SubgraphController pattern (cleaner with batch and clear)

---

## Deactivation Logic: Restore Positions

### ProcessController (lines 188-193)
```typescript
cy.nodes().forEach((node) => {
  const orgPos = node.data('orgPos');
  if (orgPos) {
    node.position(copyPosition(orgPos));
  }
});
```

### SubgraphController (lines 206-213)
```typescript
cy.nodes().forEach((node) => {
  const orgPos = node.data('orgPos');
  if (!orgPos) {
    return;
  }

  node.position(copyPosition(orgPos));
});
```

**Identical logic** ✅

---

## Deactivation Logic: Re-run Main Layout

### ProcessController (line 195)
```typescript
await runMainGraphLayout({ animateFit: true, fitPadding: 220 });
```

### SubgraphController (line 217)
```typescript
await runMainGraphLayout({ animateFit: true, fitPadding: 200 });
```

**Nearly identical** ✅
- Only difference: padding (220 vs 200)

**Decision**: Use 220 (ProcessController value seems more tested)

---

## Deactivation Logic: Clear State

### ProcessController (lines 197-198)
```typescript
activeProcess = null;
processTransitionInProgress = false;
```

### SubgraphController (lines 219-220)
```typescript
activeSubgraph = null;
transitionInProgress = false;
```

**Identical pattern** ✅

---

## Summary: Shared Patterns (90+ lines)

### Identical across both controllers:
1. **Guard checks**: Transition lock, duplicate activation check
2. **Transition locking**: Set/clear boolean flag
3. **Adding nodes/edges**: Check existing, add to cy, track IDs, clear positions
4. **Element collection**: Filter nodes/edges into collections
5. **Layout execution**: Create layout, promiseOn('layoutstop'), run, await
6. **Fit animation**: cy.animation() with fit + padding
7. **Restore positions**: Iterate nodes, restore orgPos
8. **Re-run main layout**: Call runMainGraphLayout with options
9. **Clear state**: Set active state to null

### Key Differences:
1. **CSS classes**:
   - Workflow: `process-active`, `dimmed`
   - Others: `highlighted`, `faded`, `hidden`
2. **Layout strategy**:
   - Workflow: Radial around viewport center
   - Others: Use SubviewDefinition.layout config, relative to entry node
3. **Fit padding**:
   - Workflow: 140 (activate), 220 (restore)
   - Others: 200 (both)
4. **Initial node position**:
   - Workflow: Viewport center
   - Others: No initial position (uses layout only)

---

## Unified Implementation Strategy

1. **Single state structure** that captures all needed info
2. **Shared activation flow** with conditional branches for:
   - CSS class application
   - Layout strategy
   - Fit padding
3. **Shared deactivation flow** with conditional CSS removal
4. **Single method names**: `activate()` / `deactivate()` (not show/clear/restore)
5. **Type-based dispatch**: Use `subview.type === 'workflow'` to choose behavior
