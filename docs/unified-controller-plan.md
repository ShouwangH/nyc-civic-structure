# Unified Controller Refactoring Plan

## Goal
Merge ProcessController and SubgraphController into a single unified controller that works directly with `SubviewDefinition`, eliminating ~400 lines of conversion code and ~90 lines of duplicated logic.

## Why This Matters
- **Current state**: Three type systems (ProcessDefinition, SubviewDefinition, SubgraphConfig) with constant conversions
- **Pain points**:
  - SubviewController is a thin adapter doing 400+ lines of format conversion
  - ProcessController and SubgraphController share ~90 lines of nearly identical code
  - 7-layer call chain for simple operations (adapter → converter → controller)
- **After refactoring**: Single controller, single type system, direct calls, ~500 fewer lines

## Current Architecture

### Controllers
```
SubviewController (adapter layer)
  ├─> ProcessController (workflow views)
  │   └─> show(), clear(), isActive()
  └─> SubgraphController (intra/inter views)
      └─> activate(), restore(), isActive(), getActiveId()
```

### Type Systems
1. **ProcessDefinition** - Used by ProcessController
2. **SubviewDefinition** - Unified format (current source of truth)
3. **SubgraphConfig** - Used by SubgraphController (wraps SubgraphFile)

### Key Files
- [src/graph/process-controller.ts](../src/graph/process-controller.ts) (207 lines)
- [src/graph/subgraph-controller.ts](../src/graph/subgraph-controller.ts) (230 lines)
- [src/graph/subview-controller.ts](../src/graph/subview-controller.ts) (411 lines)
- [src/graph/actionHandlers.ts](../src/graph/actionHandlers.ts) (227 lines)

## Unified Controller Design

### New Interface
```typescript
export type SubviewController = {
  // Core operations
  activate: (subview: SubviewDefinition) => Promise<void>;
  deactivate: () => Promise<void>;

  // State queries
  isActive: (id?: string) => boolean;
  getActiveId: () => string | null;
};

type SubviewControllerDeps = {
  cy: Core;
  runMainGraphLayout: (options?: MainLayoutOptions) => Promise<void>;
  nodeInfosById: Map<string, GraphNodeInfo>;
  edgeInfosById: Map<string, GraphEdgeInfo>;
};
```

### Single Internal State
```typescript
type ActiveSubviewState = {
  id: string;
  type: SubviewType;
  addedNodeIds: Set<string>;
  addedEdgeIds: Set<string>;
  affectedNodeIds: Set<string>;
  affectedEdgeIds: Set<string>;
};
```

## Implementation Tasks

### Phase 1: Analyze Shared vs Unique Logic

**Task 1.1: Map identical code sections**
- Identify line-by-line matches between controllers
- Document guard clauses (transition locks, duplicate checks)
- Document cleanup logic (remove temp elements, restore positions)
- **Output**: Markdown table showing identical sections

**Task 1.2: Map divergent logic**
- CSS class differences:
  - Workflow: `process-active`, `process-active-edge`, `dimmed`
  - Others: `highlighted`, `faded`, `hidden`
- Layout differences (if any)
- Animation differences (if any)
- **Output**: Decision table for conditional behavior

**Task 1.3: Identify data dependencies**
- What does each controller need from SubviewDefinition?
- Can we eliminate nodeInfosById/edgeInfosById lookups with better data structure?
- **Output**: Data flow diagram

### Phase 2: Create Unified Controller

**Task 2.1: Implement core structure**
- Create new `createSubviewController()` factory function
- Set up single `ActiveSubviewState`
- Implement transition guards
- Implement state queries (isActive, getActiveId)

**Task 2.2: Implement activate() method**
- Check for duplicate activation
- Call deactivate() if already active
- Add missing nodes/edges from SubviewDefinition
- Track added vs existing elements
- Apply CSS classes based on subview.type
- Run layout (use SubviewDefinition.layout directly)
- Animate fit
- Store active state

**Task 2.3: Implement deactivate() method**
- Check transition guard
- Remove CSS classes (both workflow and non-workflow)
- Remove added nodes/edges
- Restore original positions
- Run main layout
- Clear active state

**Task 2.4: Handle layout conversion**
- Move `convertLayoutConfig()` from old subview-controller
- Simplify: remove SubgraphConfig intermediate format
- Work directly with SubviewDefinition.layout

### Phase 3: Update Call Sites

**Task 3.1: Update actionHandlers.ts**
- Already uses SubviewController interface ✓
- Verify no changes needed (interface is compatible)

**Task 3.2: Update GraphCanvas.tsx**
- Review controller initialization
- Ensure deps are passed correctly

**Task 3.3: Update orchestrator.ts**
- Review how controller is created and stored
- Update runtime types if needed

### Phase 4: Remove Old Code

**Task 4.1: Delete old controllers**
- Delete [src/graph/process-controller.ts](../src/graph/process-controller.ts)
- Delete [src/graph/subgraph-controller.ts](../src/graph/subgraph-controller.ts)
- Keep: New unified subview-controller.ts

**Task 4.2: Remove conversion utilities**
- Remove `convertToProcessDefinition()` from subview-controller
- Remove `convertToSubgraphConfig()` from subview-controller
- Remove `subviewToSubgraphConfig()` from subviews.ts
- Remove `buildSubviewConfigs()` from subviews.ts

**Task 4.3: Clean up types**
- Keep: `SubviewDefinition` (single source of truth)
- Evaluate: Can we remove `ProcessDefinition`? (Check if used elsewhere)
- Evaluate: Can we remove `SubgraphConfig`? (Check if used elsewhere)

**Task 4.4: Update imports**
- Search for imports of deleted files
- Update to use new unified controller
- Run type checker to catch any missed imports

### Phase 5: Testing & Validation

**Task 5.1: Manual testing**
- Test workflow subview activation/deactivation
- Test intra subview activation/deactivation
- Test inter subview activation/deactivation
- Test switching between different subview types
- Test clicking same node twice (toggle behavior)
- Test scope changes with active subview
- Verify CSS classes are applied correctly
- Verify layouts render correctly
- Verify animations work smoothly

**Task 5.2: Edge cases**
- Test rapid clicking (transition guards)
- Test switching subviews before layout completes
- Test missing nodes in SubviewDefinition
- Test empty subviews
- Test background clicks during transition

**Task 5.3: Visual inspection**
- Compare workflow styling before/after
- Compare intra styling before/after
- Check for any visual regressions
- Verify console has no errors/warnings

## Success Criteria

### Functional Requirements
- ✅ All subview types work (workflow, intra, inter, cross-jurisdictional)
- ✅ Activation/deactivation works correctly
- ✅ Toggle behavior works (click same node twice)
- ✅ CSS classes match previous behavior
- ✅ Layouts render correctly
- ✅ Animations are smooth
- ✅ No console errors or warnings

### Code Quality
- ✅ Reduced LOC by ~500 lines
- ✅ Eliminated adapter layer (SubviewController router)
- ✅ Eliminated format conversions (400+ lines)
- ✅ Single type system (SubviewDefinition only)
- ✅ No duplicate logic between controllers
- ✅ All tests pass (if tests exist)

### Non-Goals
- **Not** adding new features
- **Not** changing data file formats
- **Not** changing SubviewDefinition schema
- **Not** refactoring styling system (keep CSS classes as-is)

## Risks & Mitigations

### Risk: CSS class differences cause visual bugs
**Mitigation**: Create lookup table for styling based on subview.type, test each type thoroughly

### Risk: Missing subtle behavior differences between controllers
**Mitigation**: Read both controllers line-by-line during Phase 1, document all differences

### Risk: Breaking change in public API
**Mitigation**: Keep SubviewController interface identical, update only internal implementation

### Risk: Layout behavior changes
**Mitigation**: Keep layout conversion logic identical to current implementation

## Open Questions

1. **ProcessDefinition usage**: Is ProcessDefinition used anywhere besides process-controller?
   - Check: processUtils.ts, graphDataPipeline.ts
   - Decision: Keep or remove?

2. **SubgraphConfig usage**: Is SubgraphConfig used anywhere besides subgraph-controller?
   - Check: orchestrator.ts, runtimeTypes.ts
   - Decision: Keep or remove?

3. **Layout config conversion**: Can we simplify layout config or does it need to stay complex?
   - Current: 80 lines, supports 4 layout types
   - Could simplify if only 1-2 types are actually used

4. **Placeholder nodes**: Does workflow need placeholder node creation for missing nodes?
   - Check: Are there workflows with missing node references?
   - Decision: Keep createPlaceholderNode() or remove?

## Files to Modify

### Primary
- [ ] `src/graph/subview-controller.ts` - Rewrite as unified controller
- [ ] `src/graph/actionHandlers.ts` - Verify compatibility (should be no changes)
- [ ] `src/graph/orchestrator.ts` - Update controller creation

### Secondary (remove/simplify)
- [ ] `src/graph/process-controller.ts` - DELETE
- [ ] `src/graph/subgraph-controller.ts` - DELETE
- [ ] `src/graph/subviews.ts` - Remove conversion functions
- [ ] `src/graph/subgraphs.ts` - Evaluate if still needed

### Types
- [ ] `src/data/types.ts` - Evaluate ProcessDefinition, SubgraphConfig removal
- [ ] `src/graph/runtimeTypes.ts` - Update if SubgraphConfig removed
- [ ] `src/graph/types.ts` - Review for any controller-related types

## Next Steps

1. **Get approval on this plan** - Review with Shouwang
2. **Answer open questions** - Research type usage
3. **Create implementation todos** - Break down into small commits
4. **Start Phase 1** - Read controllers line-by-line and document
