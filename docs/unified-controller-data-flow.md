# Unified Controller Data Flow

## Input: SubviewDefinition

The unified controller receives a complete `SubviewDefinition` with all needed data:

```typescript
{
  id: string;                    // Used for: state tracking
  type: SubviewType;             // Used for: CSS/layout dispatch
  nodes: string[];               // Used for: lookup node data
  edges: Array<{                 // Used for: create cytoscape edges
    source: string;
    target: string;
    relation?: EdgeRelation;
    detail?: string;
    label?: string;
  }>;
  layout: SubviewLayoutConfig;   // Used for: layout configuration
  anchor?: {                     // Used for: entry node positioning
    nodeId?: string;
    nodeIds?: string[];
  };
  metadata?: {                   // Used for: workflow steps display
    steps?: ProcessStep[];
  };
}
```

## Controller Dependencies

```typescript
type SubviewControllerDeps = {
  cy: Core;                                          // Cytoscape instance
  runMainGraphLayout: (options?) => Promise<void>;   // Restore main graph
  nodeInfosById: Map<string, GraphNodeInfo>;         // Lookup full node data
  edgeInfosById: Map<string, GraphEdgeInfo>;         // (May not be needed)
};
```

## Data Flow: Activation

```
SubviewDefinition
  ↓
1. Lookup nodes: subview.nodes → nodeInfosById → GraphNodeInfo[]
  ↓
2. Create edges: subview.edges → GraphEdgeInfo[] (generate IDs if needed)
  ↓
3. Add to cy: cy.add({ data: nodeInfo/edgeInfo })
  ↓
4. Apply CSS: based on subview.type
  ↓
5. Run layout: based on subview.layout (+ type-specific tweaks)
  ↓
6. Fit viewport: to new elements
```

## Data Flow: Deactivation

```
Active State
  ↓
1. Remove CSS classes
  ↓
2. Remove added elements: use tracked IDs
  ↓
3. Restore positions: from node.data('orgPos')
  ↓
4. Re-run main layout
  ↓
5. Clear state
```

## Key Insight: No Conversions Needed!

The SubviewDefinition already contains everything we need:
- ✅ Node IDs to lookup
- ✅ Edge definitions
- ✅ Layout config
- ✅ Type for dispatch
- ✅ Anchor for positioning

**We can eliminate:**
- ❌ convertToProcessDefinition()
- ❌ convertToSubgraphConfig()
- ❌ subviewToSubgraphConfig()
- ❌ ProcessDefinition type (maybe)
- ❌ SubgraphConfig type (maybe)

## Edge ID Generation

Current controllers handle edge IDs differently:

**ProcessController** (line 62-69):
```typescript
const edgeInfos = processDefinition.edges.map((edge, index) => ({
  id: `${processDefinition.id}_edge_${index}`,
  source: edge.source,
  target: edge.target,
  label: '',
  type: 'process',
  process: [processDefinition.id],
}));
```

**SubgraphController** (line 161-170):
```typescript
const edgeData: GraphEdgeInfo[] = subview.edges.map((edge, index) => ({
  id: edge.label || `${subview.id}_edge_${index}`,
  source: edge.source,
  target: edge.target,
  label: edge.label || '',
  relation: edge.relation,
  detail: edge.detail,
  type: 'structural' as const,
  process: [],
}));
```

**Unified approach:**
```typescript
const edgeInfos: GraphEdgeInfo[] = subview.edges.map((edge, index) => ({
  id: edge.label || `${subview.id}_edge_${index}`,
  source: edge.source,
  target: edge.target,
  label: edge.label || '',
  relation: edge.relation,
  detail: edge.detail,
  type: subview.type === 'workflow' ? 'process' : 'structural',
  process: subview.type === 'workflow' ? [subview.id] : [],
}));
```

## Missing Node Handling

ProcessController has placeholder node creation (lines 396-410 in current subview-controller):

```typescript
function createPlaceholderNode(id: string): GraphNodeInfo {
  console.warn('[SubviewController] Creating placeholder for missing node:', id);
  return {
    id,
    label: id.split(':')[1] || id,
    branch: 'unknown',
    type: 'placeholder',
    // ... defaults
  };
}
```

**Decision**: Keep this for workflows (they may reference future nodes), skip for other types
