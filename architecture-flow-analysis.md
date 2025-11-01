# Architecture Flow Analysis: Current vs. Ideal

**Date**: 2025-11-01
**Goal**: Compare current event flow to ideal "Out → In → Out" unidirectional architecture

---

## Ideal Architecture: Out → In → Out

### The Pattern

```
┌─────────────────────────────────────────────────────────────┐
│ OUT (User Input)                                            │
│ User clicks → Input handler enqueues Action                 │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ IN (Pure Logic Layer)                                       │
│ reducer(currentState, action) → newState                    │
│ - No side effects                                           │
│ - Testable without framework                                │
│ - Deterministic                                             │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ OUT (Effects & Render)                                      │
│ newState → React re-render + Side effects (graph mutations) │
└─────────────────────────────────────────────────────────────┘
```

**Key Principles**:
1. **Unidirectional**: Events flow one way (no circular dependencies)
2. **Pure core**: Logic layer has no side effects
3. **Effects at edges**: Side effects happen in response to state changes
4. **Testable**: Can test logic without DOM/framework

---

## Current Architecture: Two Parallel Flows

### Flow 1: Graph Canvas Events (Cytoscape clicks)

**Current Flow** when user clicks a node in the graph:

```
┌──────────────────────────────────────────────────────────┐
│ 1. Cytoscape DOM                                         │
│    User clicks node                                      │
└────────────────┬─────────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────────┐
│ 2. inputHandler.ts:35-36                                 │
│    handleNodeTapBound(event)                             │
│    → Extracts nodeId from event                          │
│    → Calls runtime.handleNodeTap(nodeId)                 │
└────────────────┬─────────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────────┐
│ 3. orchestrator.ts:156-165 ⚠️ MIXED CONCERNS             │
│    handleNodeTap(nodeId)                                 │
│                                                           │
│    if (subgraphByEntryId.has(nodeId)) {                  │
│      void activateSubgraphByEntry(nodeId);  ← Graph op   │
│      return;                                             │
│    }                                                      │
│                                                           │
│    store.setSelectedEdge(null);             ← State mut  │
│    store.setSelectedNode(nodeId);           ← State mut  │
│    store.setSidebarHover(true);             ← State mut  │
└────────────────┬─────────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────────┐
│ 4. useVisualizationState reducer                         │
│    State updates trigger re-render                       │
└────────────────┬─────────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────────┐
│ 5. App.tsx + derived selectors                          │
│    Compute activeNode from selectedNodeId               │
└────────────────┬─────────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────────┐
│ 6. DetailsSidebar renders                                │
│    Shows node details                                    │
└──────────────────────────────────────────────────────────┘
```

**Problems**:
- ⚠️ **Business logic in orchestrator** (line 157): `if (subgraphByEntryId.has(nodeId))`
- ⚠️ **Direct state mutations**: `store.setSelectedNode(nodeId)` (imperative, not pure)
- ⚠️ **Mixed concerns**: Orchestrator handles both graph operations AND state management
- ⚠️ **Not testable**: Can't test handleNodeTap without full Cytoscape runtime
- ⚠️ **Side effects in handler**: Calls async `activateSubgraphByEntry()`

---

### Flow 2: Controls Panel Events (React clicks)

**Current Flow** when user clicks a scope button:

```
┌──────────────────────────────────────────────────────────┐
│ 1. ControlsPanel.tsx:77                                  │
│    onClick={() => onScopeChange(scope.id)}               │
└────────────────┬─────────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────────┐
│ 2. App.tsx:48-58                                         │
│    handleScopeFocus(scope)                               │
│    → Just a wrapper, delegates to userActions           │
└────────────────┬─────────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────────┐
│ 3. userActions.ts:22-43 ⚠️ MIXED CONCERNS                │
│    focusScope({ scope, graphHandle, actions })           │
│                                                           │
│    actions.setActiveScope(scope);       ← State mut      │
│    actions.clearFocus();                ← State mut      │
│    actions.setSidebarHover(false);      ← State mut      │
│                                                           │
│    await graphHandle.clearProcessHighlight();  ← Graph   │
│    await graphHandle.restoreMainView();        ← Graph   │
│    graphHandle.clearNodeFocus();               ← Graph   │
│    await graphHandle.focusNodes(nodeIds);      ← Graph   │
└────────────────┬─────────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────────┐
│ 4. useVisualizationState reducer                         │
│    State updates trigger re-render                       │
└────────────────┬─────────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────────────┐
│ 5. App.tsx re-renders with new activeScope              │
│    derived.visibleProcesses updates                      │
└──────────────────────────────────────────────────────────┘
```

**Problems**:
- ⚠️ **Orchestration logic mixed with effects**: `focusScope()` does both state updates AND graph commands
- ⚠️ **No pure reducer**: State changes happen via imperative `actions.setActiveScope()` calls
- ⚠️ **Order matters**: Must call state actions first, then graph operations
- ⚠️ **Hard to test**: Can't test orchestration without mocking graphHandle
- ⚠️ **Async complexity**: Mixes sync state updates with async graph operations

---

## Gap Analysis: Current vs. Ideal

### What We Have ✅

1. **Reducer pattern in state**: `useVisualizationState` uses `useReducer`
2. **Derived selectors**: State transformations happen in `derived` object
3. **Separation of concerns**: Graph runtime isolated from React
4. **Action-based state updates**: `dispatch({ type: 'setActiveScope', scope })`

### What We're Missing ❌

1. **Pure event → action mapping**: Input handlers directly call imperative functions, not dispatch actions
2. **Pure logic layer**: Orchestration logic has side effects (graph mutations + state updates mixed)
3. **Effect layer**: No clear separation between "compute next state" and "apply side effects"
4. **Single source of truth for events**: Two different event flows (graph events vs React events)
5. **Action queue**: Events are handled immediately, not enqueued and processed

---

## Current Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER EVENTS                              │
│                                                                 │
│  Cytoscape clicks        React button clicks                   │
│        ↓                         ↓                              │
└────────┼─────────────────────────┼───────────────────────────────┘
         ↓                         ↓
┌────────────────────┐   ┌─────────────────────┐
│  inputHandler.ts   │   │  ControlsPanel      │
│  - handleNodeTap   │   │  - onClick handlers │
└────────┬───────────┘   └──────────┬──────────┘
         ↓                          ↓
┌────────────────────┐   ┌─────────────────────┐
│  orchestrator.ts   │   │  App.tsx handlers   │
│  (MIXED CONCERNS)  │   │  (thin wrappers)    │
└────────┬───────────┘   └──────────┬──────────┘
         ↓                          ↓
         └──────────┬───────────────┘
                    ↓
         ┌──────────────────────────┐
         │   userActions.ts         │ ⚠️ PROBLEM AREA
         │   (MIXED CONCERNS)       │
         │                          │
         │   - State mutations      │
         │   - Graph operations     │
         │   - Business logic       │
         └──────────┬───────────────┘
                    ↓
         ┌──────────────────────────┐
         │  useVisualizationState   │ ✅ GOOD
         │  reducer(state, action)  │
         └──────────┬───────────────┘
                    ↓
         ┌──────────────────────────┐
         │  derived selectors       │ ✅ GOOD
         └──────────┬───────────────┘
                    ↓
         ┌──────────────────────────┐
         │  App.tsx + Components    │ ✅ GOOD (after Phase 6)
         │  (Pure presentation)     │
         └──────────────────────────┘
```

**Key Issues**:
1. Two separate event entry points (Cytoscape vs React)
2. Business logic scattered (orchestrator.ts + userActions.ts)
3. No pure "action → newState" layer
4. Side effects mixed with state updates

---

## Ideal Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER EVENTS                              │
│                                                                 │
│  Cytoscape clicks        React button clicks                   │
└────────┬─────────────────────────┬───────────────────────────────┘
         ↓                         ↓
┌─────────────────────────────────────────────┐
│         UNIFIED INPUT LAYER                 │
│                                             │
│  eventToAction(event) → Action              │
│  - handleNodeClick → NodeClicked(nodeId)    │
│  - handleScopeClick → ScopeChanged(scopeId) │
└────────────────────┬────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│         PURE LOGIC LAYER                    │ ✅ PURE
│                                             │
│  reducer(state, action) → newState          │
│  - No side effects                          │
│  - Testable without React/Cytoscape         │
│  - Deterministic                            │
└────────────────────┬────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│         DERIVED SELECTORS                   │ ✅ PURE
│                                             │
│  selectActiveNode(state) → node             │
│  selectVisibleProcesses(state) → processes  │
└────────────────────┬────────────────────────┘
                     ↓
         ┌───────────┴──────────┐
         ↓                      ↓
┌─────────────────┐   ┌──────────────────────┐
│  REACT RENDER   │   │  EFFECT LAYER        │
│                 │   │                      │
│  Components     │   │  useEffect(() => {   │
│  render based   │   │    if (state.x) {    │
│  on state       │   │      graph.doThing() │
│                 │   │    }                 │
│                 │   │  }, [state.x])       │
└─────────────────┘   └──────────────────────┘
```

**Benefits**:
1. Single event entry point
2. Pure logic testable without framework
3. Side effects reactive to state changes
4. Clear separation of concerns

---

## Distance from Ideal: Scoring

| Aspect | Current State | Ideal | Score | Gap |
|--------|--------------|-------|-------|-----|
| **Unified Input** | Two separate flows (Cytoscape + React) | Single action dispatcher | 3/10 | 🔴 Large |
| **Pure Logic Layer** | Mixed with side effects (orchestrator, userActions) | Pure reducer | 4/10 | 🔴 Large |
| **State Management** | useReducer with actions ✅ | Same | 9/10 | 🟢 Small |
| **Derived Selectors** | Partial (needs Phase 6) | Complete selectors | 6/10 | 🟡 Medium |
| **Effect Layer** | Mixed throughout | Reactive effects (useEffect) | 2/10 | 🔴 Large |
| **Testability** | Needs full runtime mocks | Pure functions, easy tests | 4/10 | 🔴 Large |

**Overall Distance**: **~5/10** - Roughly halfway to ideal

---

## Specific Problems to Fix

### Problem 1: Orchestrator Handles Both Events and State

**File**: [orchestrator.ts:156-165](src/graph/orchestrator.ts#L156-L165)

```typescript
// CURRENT: Business logic + state mutations in event handler
const handleNodeTap = (nodeId: string) => {
  if (subgraphByEntryId.has(nodeId)) {       // ❌ Business logic
    void activateSubgraphByEntry(nodeId);    // ❌ Side effect
    return;
  }

  store.setSelectedEdge(null);               // ❌ Imperative state mutation
  store.setSelectedNode(nodeId);             // ❌ Imperative state mutation
  store.setSidebarHover(true);               // ❌ Imperative state mutation
};
```

**IDEAL**: Dispatch action, let reducer handle logic
```typescript
const handleNodeTap = (nodeId: string) => {
  dispatch({ type: 'NODE_CLICKED', nodeId });  // ✅ Just dispatch action
};

// Logic in reducer:
case 'NODE_CLICKED':
  return {
    ...state,
    selectedEdge: null,
    selectedNode: action.nodeId,
    isSidebarHover: true,
    // Reducer decides if this should trigger subgraph activation
    pendingSubgraphActivation: subgraphByEntryId.has(action.nodeId)
      ? action.nodeId
      : null,
  };
```

---

### Problem 2: userActions Mixes State Updates with Graph Operations

**File**: [userActions.ts:22-43](src/app/userActions.ts#L22-L43)

```typescript
// CURRENT: Mixed concerns
export const focusScope = async (params) => {
  actions.setActiveScope(scope);          // ❌ State mutation
  actions.clearFocus();                   // ❌ State mutation
  actions.setSidebarHover(false);         // ❌ State mutation

  await graphHandle.clearProcessHighlight();  // ❌ Graph operation
  await graphHandle.restoreMainView();        // ❌ Graph operation
  await graphHandle.focusNodes(nodeIds);      // ❌ Graph operation
};
```

**IDEAL**: Separate state changes from effects
```typescript
// 1. Dispatch action
dispatch({ type: 'SCOPE_FOCUSED', scope });

// 2. Reducer computes new state (pure)
case 'SCOPE_FOCUSED':
  return {
    ...state,
    activeScope: action.scope,
    selectedNodeId: null,
    selectedEdgeId: null,
    activeProcessId: null,
    activeSubgraphId: null,
    isSidebarHover: false,
  };

// 3. Effect layer reacts to state change
useEffect(() => {
  if (state.activeScope) {
    const nodeIds = scopeNodeIds[state.activeScope];
    graphHandle.focusNodes(nodeIds);
  }
}, [state.activeScope]);
```

---

### Problem 3: No Action Types / Action Creators

**Current**: Direct function calls
```typescript
onClick={() => onScopeChange(scope.id)}
```

**Ideal**: Dispatch typed actions
```typescript
onClick={() => dispatch({ type: 'SCOPE_CHANGED', scopeId: scope.id })}

// Or with action creators:
onClick={() => dispatch(actions.changeScopeAction(scope.id))}
```

---

### Problem 4: Graph Operations Called Directly, Not Reactively

**Current**: Imperative calls scattered throughout
```typescript
await graphHandle.clearProcessHighlight();
await graphHandle.restoreMainView();
await graphHandle.focusNodes(nodeIds);
```

**Ideal**: Graph operations as effects based on state
```typescript
// Effect responds to state changes
useEffect(() => {
  if (!state.activeProcessId && prevState.activeProcessId) {
    // Process was cleared, clear highlight
    graphHandle.clearProcessHighlight();
  }
}, [state.activeProcessId]);

useEffect(() => {
  if (state.activeScope) {
    const nodeIds = scopeNodeIds[state.activeScope];
    graphHandle.focusNodes(nodeIds);
  }
}, [state.activeScope]);
```

---

## Roadmap to Ideal Architecture

### Phase 7: Unify Event Flow (High Impact)

**Goal**: Single action dispatcher for all events

**Steps**:
1. Create action type definitions
2. Create action creators
3. Update inputHandler to dispatch actions instead of calling handlers
4. Update ControlsPanel callbacks to dispatch actions
5. Move business logic from orchestrator into reducer

**Effort**: 6-8 hours
**Complexity**: High (touches many files)
**Impact**: Fundamental architecture improvement

---

### Phase 8: Pure Logic Layer (High Impact)

**Goal**: All business logic in pure reducer functions

**Steps**:
1. Move `if (subgraphByEntryId.has(nodeId))` logic into reducer
2. Extract all state mutation logic from userActions into reducer
3. Make reducer pure (no side effects)
4. Add comprehensive reducer tests

**Effort**: 4-6 hours
**Complexity**: Medium
**Impact**: Testability + maintainability

---

### Phase 9: Effect Layer (Medium Impact)

**Goal**: Graph operations as reactive effects to state changes

**Steps**:
1. Create `useGraphEffects` hook
2. Move all `graphHandle.*()` calls into useEffect blocks
3. Effects react to state changes, not called directly
4. Remove async logic from event handlers

**Effort**: 5-7 hours
**Complexity**: High (timing and sequencing critical)
**Impact**: Clear separation of concerns

---

## Summary

**Current Distance from Ideal**: ~50% (5/10)

**Biggest Gaps**:
1. ❌ No unified action dispatcher (events → actions)
2. ❌ Business logic mixed with side effects (orchestrator, userActions)
3. ❌ Graph operations called imperatively, not reactively
4. ❌ Two separate event flows (Cytoscape vs React)

**Strengths**:
1. ✅ State management uses reducer pattern
2. ✅ Derived selectors (will be complete after Phase 6)
3. ✅ Graph runtime isolated from React
4. ✅ Type safety throughout

**Recommended Order**:
1. **Phase 6** (Planned): Complete derived selectors - Make App.tsx purely presentational
2. **Phase 7** (New): Unify event flow - Single action dispatcher
3. **Phase 8** (New): Pure logic layer - All logic in reducer
4. **Phase 9** (New): Effect layer - Graph operations as reactive effects

**Total Effort to Ideal**: ~15-20 hours across Phases 6-9
