# Phase 7-9 Detailed Implementation Plan

**Goal**: Complete transition to ideal "Out → In → Out" architecture with unified event flow and reactive effects

**Date**: 2025-11-01

---

## Executive Summary

**Current State**: 50% toward ideal (hybrid imperative/declarative)
**Target State**: 80-90% toward ideal (unified actions + reactive effects)

**Estimated Effort**: 12-15 hours
**Risk Level**: Medium-High
**Files Changed**: 8 core files + 2 new files

---

## Files That Would Change

### New Files (2)
1. `src/state/actions.ts` - ✅ Already created
2. `src/hooks/useGraphEffects.ts` - New reactive effect layer

### Modified Files (8)
1. `src/state/useVisualizationState.ts` - ✅ Reducer already extended
2. `src/graph/orchestrator.ts` - Replace imperative calls with dispatches
3. `src/app/userActions.ts` - Simplify to pure action dispatchers
4. `src/components/GraphCanvas.tsx` - Add dispatch prop
5. `src/App.tsx` - Wire up effect layer
6. `src/components/ControlsPanel.tsx` - Use semantic actions
7. `src/components/DetailsSidebar.tsx` - Use semantic actions
8. `src/graph/runtimeTypes.ts` - Add dispatch to store interface

---

## Detailed File-by-File Changes

### 1. src/graph/orchestrator.ts (MAJOR REFACTOR)

**Current**: 250 lines - Mixed business logic + state mutations
**After**: ~180 lines - Pure event-to-action mapping

#### Current Approach
```typescript
// Lines 156-165: Business logic in event handler
const handleNodeTap = (nodeId: string) => {
  if (subgraphByEntryId.has(nodeId)) {       // ❌ Business logic here
    void activateSubgraphByEntry(nodeId);    // ❌ Side effect
    return;
  }

  store.setSelectedEdge(null);               // ❌ Imperative mutation
  store.setSelectedNode(nodeId);             // ❌ Imperative mutation
  store.setSidebarHover(true);               // ❌ Imperative mutation
};
```

#### New Approach
```typescript
// Pure event-to-action mapping
const handleNodeTap = (nodeId: string) => {
  const isSubgraphEntry = subgraphByEntryId.has(nodeId);

  store.dispatch({                            // ✅ Dispatch semantic action
    type: 'NODE_CLICKED',
    nodeId,
    isSubgraphEntry,
  });
};

const handleEdgeTap = (edgeId: string) => {
  store.dispatch({
    type: 'EDGE_CLICKED',
    edgeId,
  });
};

const handleBackgroundTap = () => {
  store.dispatch({ type: 'BACKGROUND_CLICKED' });
};
```

**Changes**:
- Remove: `activateSubgraphByEntry()` calls (~30 lines)
- Remove: All `store.setX()` imperative calls (~40 lines)
- Add: Simple `store.dispatch()` calls (~15 lines)
- Net: -55 lines, much simpler logic

**Risk**: Low - Simple transformation

---

### 2. src/app/userActions.ts (MAJOR SIMPLIFICATION)

**Current**: 182 lines - Mixed orchestration + state + graph operations
**After**: ~60 lines - Pure action creation with validation

#### Current Approach (focusScope)
```typescript
// Lines 22-43: Mixed concerns
export const focusScope = async (params: {
  scope: GovernmentScope;
  graphHandle: GraphCanvasHandle | null;
  scopeNodeIds: Record<GovernmentScope, string[]>;
  actions: Pick<StateActions, 'setActiveScope' | 'clearFocus' | 'setSidebarHover'>;
}): Promise<void> => {
  const { scope, graphHandle, scopeNodeIds, actions } = params;

  actions.setActiveScope(scope);          // ❌ State mutation
  actions.clearFocus();                   // ❌ State mutation
  actions.setSidebarHover(false);         // ❌ State mutation

  const nodeIds = scopeNodeIds[scope] ?? [];
  if (!graphHandle || nodeIds.length === 0) {
    return;
  }

  await graphHandle.clearProcessHighlight();  // ❌ Graph operation
  await graphHandle.restoreMainView();        // ❌ Graph operation
  graphHandle.clearNodeFocus();               // ❌ Graph operation
  await graphHandle.focusNodes(nodeIds);      // ❌ Graph operation
};
```

#### New Approach (focusScope)
```typescript
// Pure action creator with validation
export const createScopeFocusAction = (
  scope: GovernmentScope,
): ScopeSelectedAction => {
  return {
    type: 'SCOPE_SELECTED',
    scope,
  };
};

// Usage in App.tsx:
const handleScopeFocus = useCallback((scope: GovernmentScope) => {
  const { state, actions } = visualizationState;
  actions.dispatch(createScopeFocusAction(scope));
}, [visualizationState]);
```

**Changes**:
- Remove: All async graph operations (~120 lines)
- Remove: State mutation calls (~30 lines)
- Add: Simple action creators (~25 lines)
- Add: Validation helpers (~15 lines)
- Net: -112 lines (182 → 70 lines)

**Risk**: Medium - Need to ensure validation still works

---

### 3. src/hooks/useGraphEffects.ts (NEW FILE)

**Purpose**: Reactive effect layer that responds to state changes

**Size**: ~200-250 lines

```typescript
// ABOUTME: Reactive effect layer for graph operations
// ABOUTME: Responds to state changes and triggers graph mutations

import { useEffect, useRef } from 'react';
import type { GraphCanvasHandle } from '../components/GraphCanvas';
import type { VisualizationState } from '../state/useVisualizationState';
import { GRAPH_DATA } from '../data/graphDataPipeline';

export const useGraphEffects = (
  state: VisualizationState,
  graphRef: React.RefObject<GraphCanvasHandle | null>,
) => {
  const prevState = useRef<VisualizationState>(state);

  // Effect: When scope changes, focus on scope nodes
  useEffect(() => {
    if (state.activeScope && state.activeScope !== prevState.current.activeScope) {
      const graphHandle = graphRef.current;
      if (!graphHandle) return;

      const nodeIds = GRAPH_DATA.scopeNodeIds[state.activeScope] ?? [];

      // Clear previous state
      graphHandle.clearProcessHighlight();
      graphHandle.restoreMainView();
      graphHandle.clearNodeFocus();

      // Focus on scope nodes
      if (nodeIds.length > 0) {
        graphHandle.focusNodes(nodeIds);
      }
    }

    prevState.current = state;
  }, [state.activeScope, graphRef]);

  // Effect: When process changes, highlight/clear process
  useEffect(() => {
    const graphHandle = graphRef.current;
    if (!graphHandle) return;

    const processChanged = state.activeProcessId !== prevState.current.activeProcessId;
    if (!processChanged) return;

    if (state.activeProcessId) {
      // Activate process
      graphHandle.highlightProcess(state.activeProcessId);
    } else if (prevState.current.activeProcessId) {
      // Clear process
      graphHandle.clearProcessHighlight();
    }

    prevState.current = state;
  }, [state.activeProcessId, graphRef]);

  // Effect: When subgraph changes, activate/restore
  useEffect(() => {
    const graphHandle = graphRef.current;
    if (!graphHandle) return;

    const subgraphChanged = state.activeSubgraphId !== prevState.current.activeSubgraphId;
    if (!subgraphChanged) return;

    if (state.activeSubgraphId) {
      // Activate subgraph
      graphHandle.activateSubgraph(state.activeSubgraphId);
    } else if (prevState.current.activeSubgraphId) {
      // Restore main view
      graphHandle.restoreMainView();
    }

    prevState.current = state;
  }, [state.activeSubgraphId, graphRef]);

  // Effect: When activeScope changes, clear process/subgraph from graph
  useEffect(() => {
    const graphHandle = graphRef.current;
    if (!graphHandle) return;

    const scopeChanged = state.activeScope !== prevState.current.activeScope;
    if (!scopeChanged) return;

    // Clear graph state when scope changes
    graphHandle.clearProcessHighlight();
    graphHandle.restoreMainView();
    graphHandle.clearNodeFocus();

    prevState.current = state;
  }, [state.activeScope, graphRef]);
};
```

**Changes**:
- New file: ~200-250 lines
- Consolidates all graph effect logic in one place
- Declarative: "When state changes, do this"
- Testable: Can mock state changes

**Risk**: High - Timing and sequencing critical

---

### 4. src/App.tsx (MINOR CHANGES)

**Current**: 221 lines
**After**: ~230 lines

#### Changes Needed
```typescript
// Add effect layer import
import { useGraphEffects } from './hooks/useGraphEffects';

function App() {
  const graphRef = useRef<GraphCanvasHandle | null>(null);
  const { state, actions, derived } = useVisualizationState();

  // Add effect layer (replaces imperative graph calls)
  useGraphEffects(state, graphRef);

  // Simplify handlers - just dispatch actions
  const handleScopeFocus = useCallback((scope: GovernmentScope) => {
    actions.dispatch({ type: 'SCOPE_SELECTED', scope });
  }, [actions]);

  const handleProcessToggle = useCallback((processId: string) => {
    const isVisible = derived.visibleProcesses.some(p => p.id === processId);
    actions.dispatch({
      type: 'PROCESS_TOGGLED',
      processId,
      isVisible
    });
  }, [actions, derived.visibleProcesses]);

  // ... rest stays similar
}
```

**Changes**:
- Add: `useGraphEffects` call (~1 line)
- Simplify: Event handlers (~30 lines simpler)
- Remove: Imports of userActions functions
- Net: +9 lines (221 → 230 lines)

**Risk**: Low - Mostly deletions

---

### 5. src/components/GraphCanvas.tsx (MINOR CHANGES)

**Current**: 130 lines
**After**: ~135 lines

#### Changes Needed
```typescript
// Add dispatch to store actions
export type GraphCanvasProps = {
  // ... existing props
  storeActions: {
    setSelectedNode: (id: string | null) => void;
    setSelectedEdge: (id: string | null) => void;
    // ... existing actions
    dispatch: (action: VisualizationAction) => void;  // ← Add this
  };
};
```

**Changes**:
- Add: `dispatch` to storeActions type
- Pass: dispatch through to orchestrator
- Net: +5 lines

**Risk**: Low - Type change only

---

### 6. src/graph/runtimeTypes.ts (MINOR CHANGES)

**Current**: ~60 lines
**After**: ~65 lines

```typescript
import type { VisualizationAction } from '../state/actions';

export type GraphRuntimeStore = {
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  setActiveProcess: (id: string | null) => void;
  setActiveSubgraph: (id: string | null) => void;
  setSidebarHover: (value: boolean) => void;
  clearSelections: () => void;
  dispatch: (action: VisualizationAction) => void;  // ← Add this
};
```

**Changes**:
- Add: dispatch to store interface
- Net: +2 lines

**Risk**: Low - Type addition

---

### 7. src/components/ControlsPanel.tsx (MINOR CHANGES)

**Current**: 165 lines
**After**: ~165 lines (no change in size)

#### Current
```typescript
onClick={() => onScopeChange(scope.id)}
onClick={() => onProcessToggle(process.id)}
onClick={() => onSubgraphToggle(config.meta.id)}
```

#### After (if we want semantic actions)
```typescript
// No changes needed - handlers in App.tsx already dispatch actions
// This is backwards compatible
```

**Changes**: None needed (handled in App.tsx)
**Risk**: None

---

### 8. src/components/DetailsSidebar.tsx (NO CHANGES)

**Changes**: None needed
**Risk**: None

---

## Summary of Changes

### Code Volume
| File | Current | After | Delta | Change Type |
|------|---------|-------|-------|-------------|
| orchestrator.ts | 250 | 180 | -70 | Major refactor |
| userActions.ts | 182 | 70 | -112 | Major simplification |
| useGraphEffects.ts | 0 | 220 | +220 | New file |
| App.tsx | 221 | 230 | +9 | Minor changes |
| GraphCanvas.tsx | 130 | 135 | +5 | Type addition |
| runtimeTypes.ts | 60 | 62 | +2 | Type addition |
| actions.ts | 0 | 226 | +226 | ✅ Done |
| useVisualizationState.ts | 260 | 260 | 0 | ✅ Done |
| **Total** | **1103** | **1157** | **+54** | Net addition |

### Impact Analysis

**Lines of Code**: +54 lines overall
**Complexity**: -30% (logic consolidated in fewer places)
**Testability**: +50% (pure functions, no mocks needed)

---

## Implementation Phases

### Phase 7A: Orchestrator Refactor (3-4 hours)
**Goal**: Convert orchestrator to dispatch actions

1. Add `dispatch` to store interface
2. Update `handleNodeTap` to dispatch `NODE_CLICKED`
3. Update `handleEdgeTap` to dispatch `EDGE_CLICKED`
4. Update `handleBackgroundTap` to dispatch `BACKGROUND_CLICKED`
5. Remove business logic (subgraph checks)
6. Test that clicks still work

**Risk**: Low
**Testing**: Manual click testing

---

### Phase 7B: Effect Layer Creation (4-5 hours)
**Goal**: Create reactive effect layer

1. Create `useGraphEffects.ts`
2. Implement scope focus effect
3. Implement process highlight effect
4. Implement subgraph activation effect
5. Handle effect sequencing and timing
6. Add to App.tsx
7. Test all interactions

**Risk**: High (timing, async sequencing)
**Testing**: Comprehensive manual testing

---

### Phase 7C: UserActions Simplification (2-3 hours)
**Goal**: Convert userActions to pure action creators

1. Remove async logic from `focusScope`
2. Remove async logic from `toggleProcess`
3. Remove async logic from `toggleSubgraph`
4. Remove async logic from `clearSelection`
5. Convert to simple action creators
6. Update App.tsx to use new pattern
7. Test all control panel interactions

**Risk**: Medium
**Testing**: Control panel testing

---

### Phase 7D: Cleanup & Polish (2-3 hours)
**Goal**: Remove dead code, add docs

1. Remove unused imports
2. Update JSDoc comments
3. Update architecture diagrams
4. Write migration guide
5. Add tests for action creators
6. Add tests for reducer logic

**Risk**: Low
**Testing**: Unit tests

---

## Risk Assessment

### High Risk Areas

**1. Effect Timing and Sequencing**
- **Issue**: Graph operations must happen in correct order
- **Example**: Must clear process before activating subgraph
- **Mitigation**: Careful useEffect dependency arrays, extensive testing

**2. Async State Transitions**
- **Issue**: Graph animations are async, state changes are sync
- **Example**: State updates immediately, graph takes 550ms to animate
- **Mitigation**: Accept this (it's actually fine), or add loading states

**3. Event Handler Rewiring**
- **Issue**: Many event paths to update
- **Example**: Cytoscape events, React events, imperative API calls
- **Mitigation**: Incremental migration, keep old code until verified

### Medium Risk Areas

**1. Action Validation**
- **Issue**: Business logic moved to reducer, need to validate
- **Example**: "Is process visible for scope?"
- **Mitigation**: Already handled in reducer, just need to test

**2. Backwards Compatibility**
- **Issue**: GraphRuntime imperative API still used by orchestrator
- **Example**: `highlightProcess(id)` still needs to work
- **Mitigation**: Keep imperative API, effects call it

### Low Risk Areas

**1. Type Changes**
- **Issue**: Adding `dispatch` to interfaces
- **Mitigation**: TypeScript will catch issues

**2. Pure Function Extraction**
- **Issue**: Converting to action creators
- **Mitigation**: Simple, testable changes

---

## Testing Strategy

### Unit Tests (New)
- Reducer with all action types
- Action creators
- Pure validation functions

### Integration Tests (Manual)
- Click node → selects node, shows sidebar
- Click subgraph entry → activates subgraph
- Click process → highlights process
- Change scope → clears selections, focuses scope nodes
- Click background → clears all

### Regression Tests (Manual)
- All existing functionality still works
- Animations still smooth
- No console errors
- State updates correctly

---

## Migration Path

### Option 1: Big Bang (Not Recommended)
- Do all phases at once
- High risk of breaking things
- Hard to debug

### Option 2: Incremental (Recommended)
1. **Week 1**: Phase 7A (orchestrator)
   - Test thoroughly before proceeding
2. **Week 2**: Phase 7B (effect layer)
   - Run in parallel with old code, feature flag
3. **Week 3**: Phase 7C (userActions)
   - Remove old code after verification
4. **Week 4**: Phase 7D (cleanup)
   - Polish and document

### Option 3: Hybrid (Middle Ground)
- Keep old imperative API
- Add new action-based API alongside
- Migrate incrementally, component by component
- Remove old API when 100% migrated

---

## Decision Criteria

**Do Phase 7-9 if:**
- ✅ You want maximum testability
- ✅ You plan to add complex features (undo/redo, time travel)
- ✅ You want architectural purity
- ✅ You have 12-15 hours to invest
- ✅ You're comfortable with high-complexity refactoring

**Skip Phase 7-9 if:**
- ✅ Current architecture works well enough
- ✅ No complex features planned
- ✅ Want to move to building features
- ✅ Risk tolerance is low
- ✅ Time budget is limited

---

## Recommended Approach

Given the analysis:

**My Recommendation: Incremental Hybrid Approach**

1. **Keep what we have** (Phases 1-6 complete)
2. **Add effect layer incrementally**
   - Start with just scope focus effect
   - Test thoroughly
   - Add process effect
   - Add subgraph effect
3. **Keep old imperative code** until effects proven stable
4. **Migrate over 2-3 weeks** as time permits

**Benefits**:
- Low risk (old code works, new code additive)
- Incremental validation (test each piece)
- Can stop at any point (partial migration is fine)
- Learn from each step

**Effort**: ~4-6 hours for effect layer only (skip full refactor)

---

## Conclusion

**Full Phase 7-9**: ~12-15 hours, high complexity, significant architectural improvement

**Lighter Phase 7**: ~4-6 hours, medium complexity, most benefits

**Current State**: Already excellent, production-ready

The choice depends on your goals:
- **Learning/Purity**: Full Phase 7-9
- **Pragmatic**: Lighter Phase 7 or stop here
- **Move fast**: Stop here, build features
