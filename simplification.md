# Thin Wrapper Patterns to Remove

## Hook Overuse Patterns

### 1. Excessive useCallback Wrapping in useVisualizationState
**Location**: `src/state/useVisualizationState.ts:98-132`

**Problem**: Double memoization - individual useCallbacks + useMemo for container object
```typescript
// Current - unnecessary individual memoization
const setControlsOpen = useCallback(
  (value: boolean) => dispatch({ type: 'SET_CONTROLS_OPEN', value }),
  [],
);
const toggleControlsOpen = useCallback(() => dispatch({ type: 'CONTROLS_TOGGLED' }), []);
// ... 3 more useCallbacks

const actions = useMemo(
  () => ({
    setControlsOpen,
    toggleControlsOpen,
    // ...
  }),
  [setControlsOpen, toggleControlsOpen, ...],  // All these deps are stable anyway
);
```

**Solution**: Just create the actions object directly, only memoize if needed for performance
```typescript
const actions = useMemo(
  () => ({
    setControlsOpen: (value: boolean) => dispatch({ type: 'SET_CONTROLS_OPEN', value }),
    toggleControlsOpen: () => dispatch({ type: 'CONTROLS_TOGGLED' }),
    // ...
  }),
  [], // Only dispatch in closure, which is stable
);
```

### 2. Trivial useCallback Wrappers in App.tsx
**Location**: `src/App.tsx:49-64`

**Problem**: Wrapping functions that just call other functions
```typescript
const handleClearSelection = useCallback(() => {
  clearSelections();  // Just calls another function - why wrap?
}, [clearSelections]);

const handleConditionalHoverOff = useCallback(() => {
  if (!selectionActive) {
    setSidebarHover(false);
  }
}, [selectionActive, setSidebarHover]);  // selectionActive changes frequently!
```

**Solution**: Pass functions directly or inline
```typescript
// Just pass clearSelections directly to onClear prop
<DetailsSidebar onClear={clearSelections} />

// Inline the conditional logic or accept that it recreates
```

### 3. stateRef Pattern
**Location**: `src/state/useVisualizationState.ts:217-227`

**Problem**: Using ref to avoid adding state to dependencies
```typescript
const stateRef = useRef(state);
stateRef.current = state;

const setState = useCallback(
  (updater: (prev: VisualizationState) => VisualizationState) => {
    const newState = updater(stateRef.current);
    dispatch({ type: 'STATE_UPDATED', payload: newState });
  },
  [dispatch],
);
```

**Issue**: This is trying to replicate `useState`'s API but on top of `useReducer`. The ref pattern here doesn't prevent re-renders (dispatch still causes them), it just avoids setState recreating. But if setState is passed to handlers once during initialization, recreation doesn't matter.

**Solution**: Either:
- Accept setState recreation (add state to deps)
- OR if handlers only need it once during initialization, the current pattern is OK but the comment is misleading

### 4. useImperativeHandle with Stale Ref
**Location**: `src/components/GraphCanvas.tsx:57-61`

**Problem**: Exposing ref value that's null during first render
```typescript
useImperativeHandle(
  ref,
  () => orchestratorRef.current as GraphRuntime,
  [],  // Empty deps means this runs once with initial null value!
);
```

**Current Bug**: ControlPanel clicks don't work because `graphRef.current` is locked to the initial null value

**Solution Option 1**: Add dependency to recreate when orchestrator changes
```typescript
useImperativeHandle(
  ref,
  () => orchestratorRef.current as GraphRuntime,
  [orchestratorRef.current],  // Re-run when orchestrator is created
);
```

**Solution Option 2 (Better)**: Use callback pattern instead of ref drilling
```typescript
// In GraphCanvas: call onRuntimeCreated callback when ready
useEffect(() => {
  // ... create orchestrator
  onRuntimeCreated?.(orchestrator);
}, [...]);

// In App: receive runtime via callback
const [runtime, setRuntime] = useState<GraphRuntime | null>(null);
<GraphCanvas onRuntimeCreated={setRuntime} />

// Pass handlers directly to ControlsPanel as props
<ControlsPanel handlers={runtime?.handlers ?? null} />
```

## Callback Pattern Instead of Ref Drilling

### Current Pattern (Problematic)
```
App
├─ graphRef = useRef<GraphCanvasHandle>()
├─ <GraphCanvas ref={graphRef} />  // Exposes via useImperativeHandle
└─ <ControlsPanel graphRef={graphRef} />  // Drills ref through props
   └─ onClick: graphRef.current?.handlers.activateSubview()
```

**Issues**:
- Ref drilling through props (anti-pattern)
- useImperativeHandle timing issues (first render = null)
- Unnecessary indirection

### Better Pattern: Callback + Props
```
App
├─ const [runtime, setRuntime] = useState<GraphRuntime | null>(null)
├─ <GraphCanvas onRuntimeCreated={setRuntime} />  // Callback when ready
└─ <ControlsPanel handlers={runtime?.handlers ?? null} />  // Direct prop
   └─ onClick: handlers.activateSubview()
```

**Benefits**:
- No ref drilling
- No timing issues (callback fires when actually ready)
- Simpler prop interface
- ControlsPanel doesn't need to know about GraphCanvas

## useReducer for Simple State is Overkill

### Current Pattern
**Location**: `src/state/useVisualizationState.ts`

**The State**: Just 6 simple values
```typescript
type VisualizationState = {
  controlsOpen: boolean;           // Simple toggle
  activeScope: GovernmentScope | null;  // Simple value
  selectedNodeId: string | null;   // Simple value
  selectedEdgeId: string | null;   // Simple value
  activeSubviewId: string | null;  // Simple value
  isSidebarHover: boolean;         // Simple toggle
};
```

**The Complexity**:
- useReducer with 9 action types
- Separate actions.ts file defining action types and creators
- Action creators wrapped in useCallback
- Actions object wrapped in useMemo
- stateRef pattern to avoid dependency issues
- Custom setState wrapper on top of dispatch

**Dead Code in Reducer** (after moving to imperative pattern):
- ❌ `SCOPE_SELECTED` - unused (App uses handlers.handleScopeChange)
- ❌ `SIDEBAR_HOVER_CHANGED` - unused
- ❌ `SELECTION_CLEARED` - unused
- ❌ `SET_ACTIVE_SCOPE` - unused (App uses handlers.handleScopeChange)
- ❌ `SET_CONTROLS_OPEN` - unused

**Actually Used**:
- ✅ `STATE_UPDATED` - used by imperative handlers (setState wrapper)
- ✅ `CONTROLS_TOGGLED` - used by toggle button
- ✅ `SET_SIDEBAR_HOVER` - used by hover events
- ✅ `CLEAR_SELECTIONS` - used by clearSelections action

**What We Actually Do Now**:
```typescript
// Imperative handlers just do:
setState(prev => ({ ...prev, activeSubviewId: id }))

// Which triggers:
case 'STATE_UPDATED':
  return { ...state, ...action.payload };  // Literally just {...state, ...update}
```

We're using `setState` pattern but with extra steps through a reducer!

### Why useReducer Was Chosen (Originally)

useReducer makes sense when:
- Complex state updates with business logic
- Multiple related fields updating together
- Want to enforce valid state transitions

**Example where it made sense**:
```typescript
case 'SCOPE_SELECTED':
  return {
    ...state,
    activeScope: action.scope,
    selectedNodeId: null,      // Clear related fields
    selectedEdgeId: null,      // Enforce valid state
    isSidebarHover: false,
  };
```

This was good when user interactions triggered reducer actions.

### What Changed

We moved to **imperative handlers**:
- User clicks → handlers → handlers update state directly
- Handlers contain the business logic (clear related fields, etc.)
- Reducer became a pass-through: `{ ...state, ...payload }`

**The reducer logic moved to handlers**:
```typescript
// actionHandlers.ts - handleScopeChange
setState(prev => ({
  ...prev,
  activeScope: scope,
  selectedNodeId: null,      // Business logic here now
  selectedEdgeId: null,
  isSidebarHover: false,
}));
```

### Simpler Alternative: useState

Since we're using imperative setState pattern anyway, just use useState:

```typescript
export const useVisualizationState = () => {
  const [controlsOpen, setControlsOpen] = useState(true);
  const [activeScope, setActiveScope] = useState<GovernmentScope | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [activeSubviewId, setActiveSubviewId] = useState<string | null>(null);
  const [isSidebarHover, setIsSidebarHover] = useState(false);

  // For imperative handlers - single setState that updates multiple fields
  const setState = useCallback((updates: Partial<VisualizationState>) => {
    if (updates.controlsOpen !== undefined) setControlsOpen(updates.controlsOpen);
    if (updates.activeScope !== undefined) setActiveScope(updates.activeScope);
    if (updates.selectedNodeId !== undefined) setSelectedNodeId(updates.selectedNodeId);
    if (updates.selectedEdgeId !== undefined) setSelectedEdgeId(updates.selectedEdgeId);
    if (updates.activeSubviewId !== undefined) setActiveSubviewId(updates.activeSubviewId);
    if (updates.isSidebarHover !== undefined) setIsSidebarHover(updates.isSidebarHover);
  }, []);

  // Simple action wrappers (no useCallback needed)
  const actions = {
    toggleControlsOpen: () => setControlsOpen(prev => !prev),
    setSidebarHover: setIsSidebarHover,
    clearSelections: () => {
      setActiveScope(null);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setActiveSubviewId(null);
      setIsSidebarHover(false);
    },
  };

  // Derived state (same useMemo logic)
  const derived = useMemo(() => {
    // ... same computation
  }, [activeScope, selectedNodeId, selectedEdgeId, activeSubviewId, isSidebarHover]);

  return {
    state: { controlsOpen, activeScope, selectedNodeId, selectedEdgeId, activeSubviewId, isSidebarHover },
    actions,
    derived,
    setState,  // For imperative handlers
  };
};
```

**Benefits**:
- No actions.ts file needed (~70 lines deleted)
- No reducer with 9 cases (~90 lines deleted)
- No stateRef pattern needed
- No double memoization (useCallback + useMemo)
- Simpler mental model - it's just useState
- Same API for consumers (state, actions, derived, setState)

**Trade-off**:
- setState calls all setters even if value unchanged (React batches & bails out if same value)
- Less "Redux-like" (but we don't need Redux patterns for 6 simple values)

### Alternative: Keep useReducer, Simplify Actions

If we want to keep useReducer:

```typescript
type Action =
  | { type: 'TOGGLE_CONTROLS' }
  | { type: 'SET_SIDEBAR_HOVER'; value: boolean }
  | { type: 'CLEAR_SELECTIONS' }
  | { type: 'UPDATE_STATE'; payload: Partial<VisualizationState> };  // Only one needed!

const reducer = (state: VisualizationState, action: Action) => {
  switch (action.type) {
    case 'TOGGLE_CONTROLS':
      return { ...state, controlsOpen: !state.controlsOpen };
    case 'SET_SIDEBAR_HOVER':
      return { ...state, isSidebarHover: action.value };
    case 'CLEAR_SELECTIONS':
      return { ...state, activeScope: null, selectedNodeId: null, selectedEdgeId: null, activeSubviewId: null, isSidebarHover: false };
    case 'UPDATE_STATE':
      return { ...state, ...action.payload };
  }
};
```

Delete 5 unused action types, keep 4 actually used ones. Still simpler than current.

### Recommendation

**For this codebase**: Use useState. The state is simple, the imperative handlers do the business logic, and we're already using setState pattern. The reducer adds complexity without benefit.

**Files to delete/simplify**:
- Delete `src/state/actions.ts` entirely (~70 lines)
- Simplify `src/state/useVisualizationState.ts` (~150 lines down to ~60 lines)
- Total: ~160 lines deleted, simpler mental model
