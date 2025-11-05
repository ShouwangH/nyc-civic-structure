# Code Consolidation Opportunities After Imperative Refactor

## Executive Summary

After the dispatch → imperative refactor, we now have **TWO PARALLEL EXECUTION PATHS** doing the same work. Significant consolidation is possible.

**Estimated reduction:** ~500-600 lines of code, 3-4 files eliminated

---

## The Duplication Problem

### Two Execution Paths

**Path 1: LEGACY (Dispatch + Effect Layer)**
```
ControlsPanel button click
  ↓
dispatch({ type: 'PROCESS_TOGGLED' })
  ↓
Reducer updates activeProcessId/activeSubgraphId
  ↓
useGraphEffects watches state changes
  ↓
graphHandle.highlightProcess(processId)
  ↓
orchestrator.highlightProcess()
  ↓
controller.showProcess()
  ↓
processController.show()
```

**Path 2: NEW (Imperative)**
```
User clicks node
  ↓
orchestrator event handler
  ↓
handlers.handleNodeClick(nodeId)
  ↓
subviewController.activate(subview)
  ↓
processController.show() OR subgraphController.activate()
  ↓
setState() syncs activeSubviewId
```

**Both paths reach the same specialized controllers, but through different routing!**

---

## Specific Duplication

### 1. Duplicate State Fields

`src/state/useVisualizationState.ts`:15
```typescript
activeProcessId: string | null;         // LEGACY
activeSubgraphId: string | null;        // LEGACY
activeSubviewId: string | null;         // NEW (comment says "will replace above two")
```

**Problem:** Three fields tracking similar state. The NEW field isn't used by useGraphEffects, so legacy fields must remain.

---

### 2. Duplicate Controller Layers

**GraphController** (`src/graph/controller.ts`): 79 lines
- Pure delegation layer
- No actual logic
- Just forwards calls to specialized controllers

```typescript
export type GraphController = {
  showProcess: (...) => Promise<void>;           // → processController.show()
  clearProcessHighlight: () => Promise<void>;    // → processController.clear()
  activateSubgraph: (...) => Promise<void>;      // → subgraphController.activate()
  restoreMainView: () => Promise<void>;          // → subgraphController.restore()
  // etc...
};
```

**SubviewController** (`src/graph/subview-controller.ts`): 410 lines
- ALSO delegates to specialized controllers
- Adds format conversion logic
- Routes based on subview type

**Problem:** Two controllers delegating to the same specialized controllers. GraphController adds no value in the NEW path.

---

### 3. Duplicate Orchestrator APIs

**Orchestrator exposes TWO APIs** (`src/graph/orchestrator.ts`):

**Legacy API** (lines 56-128): Used by useGraphEffects
```typescript
highlightProcess(processId: string)
clearProcessHighlight()
activateSubgraph(subgraphId: string)
restoreMainView()
```

**NEW API** (line 270): Used by imperative handlers
```typescript
handlers: GraphActionHandlers | null
```

**Problem:** Legacy API methods are ~70 lines of wrapper code that just call controller methods.

---

### 4. useGraphEffects - Entire Reactive Layer

`src/hooks/useGraphEffects.ts`: 140 lines

**Purpose:** Watch state changes and sync to graph operations

**Key code** (lines 58-59):
```typescript
const processChanged = state.activeProcessId !== prev.activeProcessId;
const subgraphChanged = state.activeSubgraphId !== prev.activeSubgraphId;
```

**Problem:**
- Only watches LEGACY state fields (activeProcessId, activeSubgraphId)
- Does NOT watch NEW field (activeSubviewId)
- Entire file exists ONLY to support the LEGACY dispatch path
- If we remove the dispatch path, this entire file becomes unnecessary

---

### 5. Branching Event Handlers

**Orchestrator event handlers** (`src/graph/orchestrator.ts`):130-170

Every handler has NEW vs LEGACY branching:
```typescript
const handleNodeTap = (nodeId: string) => {
  // NEW: Use imperative handlers if available
  if (handlers) {
    handlers.handleNodeClick(nodeId);
    return;
  }

  // LEGACY: Fallback to dispatch pattern
  dispatch({ type: 'NODE_CLICKED', nodeId, isSubgraphEntry });
};
```

**Problem:** Duplicated branching logic in 3 handlers (node, edge, background).

---

### 6. GraphCanvas Handle - Duplicate API Exposure

`src/components/GraphCanvas.tsx`:12-22

Exposes BOTH legacy methods AND new handlers:
```typescript
export type GraphCanvasHandle = {
  // LEGACY API
  highlightProcess: GraphRuntime['highlightProcess'];
  clearProcessHighlight: GraphRuntime['clearProcessHighlight'];
  activateSubgraph: GraphRuntime['activateSubgraph'];
  restoreMainView: GraphRuntime['restoreMainView'];
  focusNodes: GraphRuntime['focusNodes'];
  clearNodeFocus: GraphRuntime['clearNodeFocus'];

  // NEW API
  handlers: GraphActionHandlers | null;
};
```

---

## Where Is The Legacy Path Actually Used?

**ONLY in ControlsPanel** for process/subgraph toggles:

`src/components/ControlsPanel.tsx` dispatches:
- `PROCESS_TOGGLED` action
- `SUBGRAPH_TOGGLED` action

These update `activeProcessId`/`activeSubgraphId` → trigger useGraphEffects → call legacy orchestrator API.

**Node clicks** already use the NEW imperative path.

---

## Consolidation Plan

### Phase 1: Unify ControlsPanel

**Change:** Make ControlsPanel use imperative handlers instead of dispatch

**Before:**
```typescript
// ControlsPanel.tsx
onClick={() => dispatch({ type: 'PROCESS_TOGGLED', processId })}
```

**After:**
```typescript
// ControlsPanel.tsx
onClick={() => graphRef.current?.handlers?.activateSubview(processId)}
```

**Files touched:**
- `src/components/ControlsPanel.tsx` - Use handlers instead of dispatch

**Lines saved:** ~10 lines (dispatch calls → handler calls)

---

### Phase 2: Remove useGraphEffects

**Why:** No longer needed if everything goes through imperative handlers

**Files removed:**
- `src/hooks/useGraphEffects.ts` - **140 lines**

**Files touched:**
- `src/App.tsx` - Remove useGraphEffects import and usage

**Lines saved:** ~140 lines

---

### Phase 3: Remove Legacy State Fields

**Change:** Remove `activeProcessId` and `activeSubgraphId`, keep only `activeSubviewId`

**Files touched:**
- `src/state/useVisualizationState.ts`:
  - Remove activeProcessId/activeSubgraphId from state type (2 fields)
  - Remove from initialState
  - Update reducer cases to use activeSubviewId
  - Remove derived selectors that use legacy fields

**Lines saved:** ~50 lines

---

### Phase 4: Remove Legacy Orchestrator API

**Change:** Remove highlightProcess, activateSubgraph, clearProcessHighlight, restoreMainView

**Files touched:**
- `src/graph/orchestrator.ts`:
  - Remove functions: highlightProcess (lines 79-98), clearProcessHighlight (56-62), restoreMainView (64-73), activateSubgraph (121-128)
  - Remove from runtime export
- `src/graph/runtimeTypes.ts`:
  - Remove methods from GraphRuntime type
- `src/components/GraphCanvas.tsx`:
  - Remove methods from GraphCanvasHandle type
  - Remove from useImperativeHandle

**Lines saved:** ~120 lines

---

### Phase 5: Simplify Event Handlers

**Change:** Remove NEW vs LEGACY branching, only keep imperative path

**Before:**
```typescript
const handleNodeTap = (nodeId: string) => {
  if (handlers) {
    handlers.handleNodeClick(nodeId);
    return;
  }
  dispatch({ type: 'NODE_CLICKED', nodeId, isSubgraphEntry });
};
```

**After:**
```typescript
const handleNodeTap = (nodeId: string) => {
  handlers?.handleNodeClick(nodeId);
};
```

**Files touched:**
- `src/graph/orchestrator.ts` - Simplify handleNodeTap, handleEdgeTap, handleBackgroundTap

**Lines saved:** ~30 lines

---

### Phase 6: Remove or Flatten GraphController

**Option A: Remove GraphController entirely**

**Change:** Have orchestrator create specialized controllers directly, bypass GraphController

**Before:**
```typescript
const controller = createGraphController(cy, mainGraph);
await controller.showProcess(...); // orchestrator → controller → processController
```

**After:**
```typescript
const processController = createProcessController({ cy, runMainGraphLayout });
await processController.show(...); // orchestrator → processController (direct)
```

**Files touched:**
- `src/graph/orchestrator.ts` - Create specialized controllers directly
- `src/graph/controller.ts` - **DELETE ENTIRE FILE** (**79 lines**)

**Option B: Keep GraphController for organizational purposes**

If you like having a single "controller" interface for testing/mocking, keep it. But it's technically unnecessary.

---

### Phase 7: Remove Legacy Reducer Cases

**Change:** Remove dispatch actions that are no longer used

**Files touched:**
- `src/state/actions.ts` - Remove action types: NODE_CLICKED, EDGE_CLICKED, BACKGROUND_CLICKED, PROCESS_TOGGLED, SUBGRAPH_TOGGLED
- `src/state/useVisualizationState.ts` - Remove reducer cases for those actions

**Lines saved:** ~120 lines

---

## Summary of Consolidation

| Phase | What | Lines Saved | Files Removed |
|-------|------|-------------|---------------|
| 1. Unify ControlsPanel | Use handlers instead of dispatch | ~10 | 0 |
| 2. Remove useGraphEffects | Delete reactive layer | ~140 | 1 file |
| 3. Remove legacy state | One unified subview ID | ~50 | 0 |
| 4. Remove legacy API | Delete orchestrator methods | ~120 | 0 |
| 5. Simplify event handlers | Remove branching | ~30 | 0 |
| 6. Remove GraphController | Direct specialized controllers | ~79 | 1 file |
| 7. Remove legacy actions | Clean up reducer | ~120 | 0 |
| **TOTAL** | | **~549 lines** | **2 files** |

---

## Benefits

1. **Single execution path:** Easy to trace and debug
2. **No state-driven effects:** Imperative calls + explicit state sync
3. **Less indirection:** Fewer delegation layers
4. **Clearer architecture:** One way to do things, not two
5. **Easier testing:** Fewer code paths to test
6. **Faster onboarding:** New developers don't need to understand two systems

---

## Risks & Mitigation

### Risk 1: Breaking existing tests

**Mitigation:** Run test suite after each phase. Update tests to use new patterns.

### Risk 2: Feature regression

**Mitigation:**
- Thorough manual testing after each phase
- Keep phases small and reversible
- Test all interaction paths (node clicks, button clicks, scope changes)

### Risk 3: Losing flexibility

**Concern:** What if we need the dispatch pattern later?

**Reality:** The imperative pattern is more flexible:
- Can add new routing logic in one place (actionHandlers)
- Can still dispatch state changes if needed
- Easier to add async operations

---

## Recommendation

**Do it.** The imperative refactor is incomplete while both paths exist. Completing the consolidation will:
- Reduce complexity significantly
- Make the codebase easier to maintain
- Eliminate a whole class of bugs (race conditions between effect layer and imperative handlers)
- Make future feature additions clearer

**Suggested order:**
1. Phase 1 (ControlsPanel) - Low risk, immediate benefit
2. Phase 2 (useGraphEffects) - Removes largest chunk of code
3. Phase 5 (Event handlers) - Simplifies orchestrator
4. Phase 4 (Legacy API) - Clean up orchestrator
5. Phase 3 (Legacy state) - Clean up state management
6. Phase 7 (Reducer cases) - Clean up actions
7. Phase 6 (GraphController) - Optional, save for last

---

## Detailed Testing Plan

### Testing Strategy

After each phase, we must verify that ALL interaction paths still work:

1. **Node interactions** - Click any node
2. **Edge interactions** - Click any edge
3. **Background clicks** - Click empty canvas
4. **Scope changes** - Change between city/state/federal
5. **Process toggles** - Toggle processes from ControlsPanel
6. **Subview toggles** - Toggle subviews from ControlsPanel
7. **Workflow subviews** - Click nodes that activate workflow subviews
8. **Intra subviews** - Click nodes that activate intra-entity subviews
9. **Cross-jurisdictional subviews** - Click nodes that activate cross-jurisdictional subviews

### Phase 1: Unify ControlsPanel

**Changes:**
- [ ] Update ControlsPanel to receive `graphRef` prop
- [ ] Replace `dispatch({ type: 'PROCESS_TOGGLED' })` with `graphRef.current?.handlers?.activateSubview()`
- [ ] Replace `dispatch({ type: 'SUBGRAPH_TOGGLED' })` with `graphRef.current?.handlers?.activateSubview()`
- [ ] Update App.tsx to pass `graphRef` to ControlsPanel

**Manual Testing:**
1. [ ] Click a process button in ControlsPanel - verify process activates
2. [ ] Click same process button again - verify process deactivates
3. [ ] Click different process button - verify switch works
4. [ ] Change scope, then click process button - verify process activates in new scope
5. [ ] Click a subview button in ControlsPanel (if visible) - verify subview activates
6. [ ] Click node with subview - verify subview activates
7. [ ] Click background - verify everything deactivates
8. [ ] Verify sidebar updates correctly for all interactions
9. [ ] Verify no console errors

**Automated Testing:**
- [ ] Run `npm test` - all existing tests should pass
- [ ] If tests fail, update them to use new patterns

**Success Criteria:**
- ✅ All manual tests pass
- ✅ All automated tests pass
- ✅ No console errors
- ✅ ControlsPanel no longer uses dispatch for PROCESS_TOGGLED/SUBGRAPH_TOGGLED

---

### Phase 2: Remove useGraphEffects

**Changes:**
- [ ] Delete `src/hooks/useGraphEffects.ts`
- [ ] Remove useGraphEffects import from `src/App.tsx`
- [ ] Remove useGraphEffects call from `src/App.tsx`
- [ ] Remove ENABLE_EFFECT_LAYER feature flag

**Manual Testing:**
1. [ ] Repeat ALL 9 manual tests from Phase 1
2. [ ] Specifically test that ControlsPanel buttons still work (they should use handlers now)
3. [ ] Test rapid clicking (verify no race conditions)
4. [ ] Test clicking multiple nodes quickly
5. [ ] Test switching between scopes rapidly

**Automated Testing:**
- [ ] Run `npm test` - all tests should pass
- [ ] Check for any tests that import useGraphEffects - remove them

**Success Criteria:**
- ✅ All manual tests pass
- ✅ All automated tests pass
- ✅ No console errors
- ✅ useGraphEffects.ts deleted
- ✅ No references to useGraphEffects remain in codebase

---

### Phase 3: Remove Legacy State Fields

**Changes:**
- [ ] Remove `activeProcessId` from VisualizationState type
- [ ] Remove `activeSubgraphId` from VisualizationState type
- [ ] Remove from initialState
- [ ] Update reducer to not set these fields
- [ ] Update derived selectors to use `activeSubviewId` instead
- [ ] Search codebase for any remaining references

**Manual Testing:**
1. [ ] Repeat ALL 9 manual tests from Phase 1
2. [ ] Check sidebar displays correct info (should show subview label, not separate process/subgraph label)
3. [ ] Verify state in React DevTools shows only `activeSubviewId`

**Automated Testing:**
- [ ] Run `npm test`
- [ ] Update any tests that reference activeProcessId/activeSubgraphId

**Success Criteria:**
- ✅ All manual tests pass
- ✅ All automated tests pass
- ✅ No console errors
- ✅ No references to activeProcessId/activeSubgraphId in codebase
- ✅ State only has `activeSubviewId`

---

### Phase 4: Remove Legacy Orchestrator API

**Changes:**
- [ ] Remove `highlightProcess()` from orchestrator.ts
- [ ] Remove `clearProcessHighlight()` from orchestrator.ts
- [ ] Remove `activateSubgraph()` from orchestrator.ts
- [ ] Remove `restoreMainView()` from orchestrator.ts
- [ ] Remove from GraphRuntime type in runtimeTypes.ts
- [ ] Remove from GraphCanvasHandle type in GraphCanvas.tsx
- [ ] Remove from useImperativeHandle in GraphCanvas.tsx

**Manual Testing:**
1. [ ] Repeat ALL 9 manual tests from Phase 1
2. [ ] Verify no functionality regression

**Automated Testing:**
- [ ] Run `npm test`
- [ ] Check for tests that call these methods - update to use handlers instead

**Success Criteria:**
- ✅ All manual tests pass
- ✅ All automated tests pass
- ✅ No console errors
- ✅ Legacy API methods removed
- ✅ GraphCanvasHandle only exposes focusNodes, clearNodeFocus, handlers, getCy, getController

---

### Phase 5: Simplify Event Handlers

**Changes:**
- [ ] Simplify `handleNodeTap()` to only use handlers (remove dispatch fallback)
- [ ] Simplify `handleEdgeTap()` to only use handlers (remove dispatch fallback)
- [ ] Simplify `handleBackgroundTap()` to only use handlers (remove dispatch fallback)
- [ ] Remove `subgraphByEntryId` parameter (no longer needed)

**Manual Testing:**
1. [ ] Repeat ALL 9 manual tests from Phase 1
2. [ ] Test error handling: What happens if handlers is null? (Should gracefully fail)

**Automated Testing:**
- [ ] Run `npm test`
- [ ] Verify all event handler tests pass

**Success Criteria:**
- ✅ All manual tests pass
- ✅ All automated tests pass
- ✅ No console errors
- ✅ Event handlers no longer branch on NEW vs LEGACY
- ✅ Event handlers are simplified (3-5 lines each)

---

### Phase 6: Remove or Flatten GraphController

**Decision Point:** Pause here and decide if we want to keep GraphController or remove it.

**Option A: Remove GraphController**

**Changes:**
- [ ] Delete `src/graph/controller.ts`
- [ ] Remove GraphController type export
- [ ] Update orchestrator to not create GraphController
- [ ] Remove controller from GraphCanvasHandle
- [ ] Search for any remaining references

**Manual Testing:**
1. [ ] Repeat ALL 9 manual tests from Phase 1
2. [ ] Verify getController() returns null (or remove it from API)

**Automated Testing:**
- [ ] Run `npm test`
- [ ] Remove tests that test GraphController specifically

**Success Criteria:**
- ✅ All manual tests pass
- ✅ All automated tests pass
- ✅ No console errors
- ✅ controller.ts deleted
- ✅ No references to GraphController in codebase

**Option B: Keep GraphController**

Skip this phase. Document why we're keeping it (testing, organization, etc.)

---

### Phase 7: Remove Legacy Reducer Cases

**Changes:**
- [ ] Remove `NODE_CLICKED` action type from actions.ts
- [ ] Remove `EDGE_CLICKED` action type from actions.ts
- [ ] Remove `BACKGROUND_CLICKED` action type from actions.ts
- [ ] Remove `PROCESS_TOGGLED` action type from actions.ts
- [ ] Remove `SUBGRAPH_TOGGLED` action type from actions.ts
- [ ] Remove corresponding reducer cases from useVisualizationState.ts
- [ ] Search for any remaining dispatch calls to these actions

**Manual Testing:**
1. [ ] Repeat ALL 9 manual tests from Phase 1
2. [ ] Verify no dispatch calls remain in codebase (except for semantic actions like CONTROLS_TOGGLED)

**Automated Testing:**
- [ ] Run `npm test`
- [ ] Remove tests for deleted action types

**Success Criteria:**
- ✅ All manual tests pass
- ✅ All automated tests pass
- ✅ No console errors
- ✅ Legacy action types removed
- ✅ Reducer is smaller and cleaner
- ✅ Only semantic actions remain (CONTROLS_TOGGLED, SET_SIDEBAR_HOVER, etc.)

---

## Final Verification

After completing all phases:

**Full Manual Test Suite:**
1. [ ] Click every type of node (regular, subview anchor, workflow anchor, cross-jurisdictional)
2. [ ] Click every type of edge
3. [ ] Click background multiple times
4. [ ] Change scope to city, then state, then federal, then null
5. [ ] Toggle every process in ControlsPanel
6. [ ] Toggle every subview in ControlsPanel (if visible)
7. [ ] Test rapid clicking (spam clicks on different nodes)
8. [ ] Test switching between different subview types quickly
9. [ ] Test clicking same subview anchor twice (should toggle)
10. [ ] Test clicking different subview anchors (should switch)
11. [ ] Open/close controls panel
12. [ ] Hover sidebar
13. [ ] Check sidebar displays correct info for nodes, edges, processes, subviews
14. [ ] Check React DevTools state structure
15. [ ] Check for any console warnings or errors

**Code Quality Checks:**
- [ ] Run `npm test` - all tests pass
- [ ] Run `npm run build` - builds successfully
- [ ] Run linter - no errors
- [ ] Search codebase for TODOs related to dispatch/effect layer - remove them
- [ ] Check git diff - verify all deletions are intentional

**Performance Checks:**
- [ ] Load time - should be same or faster
- [ ] Animation smoothness - no regressions
- [ ] Memory usage - should be lower (fewer listeners, smaller state)

**Success Criteria:**
- ✅ All manual tests pass
- ✅ All automated tests pass
- ✅ Build succeeds
- ✅ No console errors or warnings
- ✅ Code is cleaner and more maintainable
- ✅ ~550 lines removed, 2 files deleted
- ✅ Single execution path for all interactions

---

## Open Questions

1. **Should we keep GraphController for organizational purposes?**
   - It's a clean interface for testing
   - But adds indirection

2. **Should subviewController become the "main controller"?**
   - It already handles all subview routing
   - Could absorb focusNodes/clearNodeFocus from nodeFocusController

3. **Do we need the orchestrator at all?**
   - It's mostly initialization and event wiring
   - Could move to GraphCanvas component directly
