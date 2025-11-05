# Refactoring TODOs - Engineering Improvements

## Priority 1: 🔴 State Management Refactoring (CRITICAL)

**File:** `src/state/useVisualizationState.ts`

**Problem:** Manual state syncing that reimplements React's `useReducer`

**Current Code (lines 43-53):**
```typescript
const setState = useCallback((updater) => {
    const updates = updater(stateRef.current);

    if (updates.controlsOpen !== stateRef.current.controlsOpen) setControlsOpen(updates.controlsOpen);
    if (updates.activeScope !== stateRef.current.activeScope) setActiveScope(updates.activeScope);
    if (updates.selectedNodeId !== stateRef.current.selectedNodeId) setSelectedNodeId(updates.selectedNodeId);
    if (updates.selectedEdgeId !== stateRef.current.selectedEdgeId) setSelectedEdgeId(updates.selectedEdgeId);
    if (updates.activeSubviewId !== stateRef.current.activeSubviewId) setActiveSubviewId(updates.activeSubviewId);
    if (updates.isSidebarHover !== stateRef.current.isSidebarHover) setIsSidebarHover(updates.isSidebarHover);
  }, []);
```

**Why Critical:**
- Every new state field requires updating 6+ places
- High maintenance burden
- Error-prone (easy to forget a field)
- Reimplements built-in React functionality

**Tasks:**
- [ ] Replace 6 separate `useState` calls with single `useReducer`
- [ ] Define action types (SET_SCOPE, SELECT_NODE, ACTIVATE_SUBVIEW, etc.)
- [ ] Create reducer function to handle state updates
- [ ] Update action handlers to dispatch actions instead of calling setState
- [ ] Remove manual state syncing boilerplate
- [ ] Remove stateRef (no longer needed with reducer)
- [ ] Test that all state updates work correctly

**Expected Outcome:**
- Single source of truth for state updates
- Easy to add/remove state fields
- Standard React pattern
- Less code, fewer bugs

---

## Priority 2: 🔴 Extract Layout Algorithms (HIGH IMPACT)

**File:** `src/graph/subview-controller.ts` (466 lines)

**Problem:** Controller mixing concerns - contains 90-line layout algorithm

**Specific Issues:**
- Lines 357-447: `calculateConcentricLevels()` - complex graph traversal algorithm
- Lines 283-354: `createStructuralLayoutOptions()` - layout configuration logic
- Controller should coordinate, not implement algorithms

**Why High Impact:**
- Makes testing difficult (can't test layout separately)
- Makes controller file hard to understand
- Hard to reuse layout logic elsewhere
- Violates single responsibility principle

**Tasks:**
- [ ] Create `src/graph/layouts/` directory
- [ ] Extract `calculateConcentricLevels()` to `src/graph/layouts/concentric.ts`
- [ ] Extract `createStructuralLayoutOptions()` to `src/graph/layouts/structural.ts`
- [ ] Extract layout helper functions from `layout.ts` if needed
- [ ] Update subview-controller to import layout functions
- [ ] Write unit tests for extracted layout algorithms
- [ ] Verify all layouts still work correctly

**Expected Outcome:**
- Controller focuses on coordination only (~300 lines vs 466)
- Layout algorithms are testable in isolation
- Reusable layout logic
- Clearer separation of concerns

**Files to Create:**
```
src/graph/layouts/
  ├── concentric.ts       (concentric layout algorithm)
  ├── structural.ts       (structural layout options)
  └── index.ts           (exports)
```

---

## Priority 3: 🟡 Investigate ProcessDefinition vs SubviewDefinition (MEDIUM-HIGH)

**File:** `src/graph/graphDataPipeline.ts`

**Problem:** Conversion function suggests confused domain modeling

**Current Code (lines 16-51):**
```typescript
function convertProcessToSubview(
  process: ProcessDefinition,
  jurisdiction: GovernmentScope
): SubviewDefinition {
  return {
    id: process.id,
    label: process.label,
    description: process.description,
    type: 'workflow',
    // ... lots of mapping
  };
}
```

**Why Important:**
- Creates conceptual overhead ("what's the difference?")
- Extra conversion code to maintain
- Suggests fundamental modeling issue

**Investigation Tasks:**
- [ ] Compare `ProcessDefinition` and `SubviewDefinition` type structures
- [ ] List what's different between them
- [ ] Understand why processes aren't just subviews with `type: 'workflow'`
- [ ] Check if `ProcessDefinition` is used anywhere else
- [ ] Determine if processes should extend subviews or be separate

**Possible Solutions:**
1. **Option A:** Make `ProcessDefinition extends SubviewDefinition`
   - Processes ARE subviews, just with extra `steps` field
   - No conversion needed

2. **Option B:** Keep separate but add clarity
   - Processes are data layer concept
   - Subviews are runtime/graph concept
   - Document the distinction clearly

3. **Option C:** Merge completely
   - Single type: `Subview` with optional fields
   - Type discriminated by `type: 'workflow' | 'structural' | ...`

**Decision Criteria:**
- Does ProcessDefinition have fields SubviewDefinition doesn't need?
- Are processes ever used without becoming subviews?
- What does the domain model say (are they conceptually different)?

**Tasks After Decision:**
- [ ] Implement chosen solution
- [ ] Remove conversion function if merging
- [ ] Update type definitions
- [ ] Update all usages
- [ ] Update documentation

---

## Priority 4: 🟡 Rename "Unified" to Domain Name (MEDIUM)

**File:** `src/data/unifiedDataset.ts`

**Problem:** Temporal naming that describes history, not purpose

**Why Important:**
- "Unified" describes how it was created (merging datasets)
- Future developers won't understand "unified as opposed to what?"
- Temporal names age poorly
- Reduces onboarding speed

**Tasks:**
- [ ] Determine appropriate domain name (e.g., `governmentDataset`, `civicStructure`, `nycData`)
- [ ] Rename file: `unifiedDataset.ts` → `{newName}.ts`
- [ ] Rename type: `UnifiedDatasetResult` → `{NewName}`
- [ ] Rename function: `buildUnifiedDataset` → `build{NewName}`
- [ ] Update all imports across codebase
- [ ] Update any documentation/comments referencing "unified"
- [ ] Test that build still works

**Suggested Names:**
- `governmentDataset.ts` - describes what it contains
- `civicStructureData.ts` - describes the domain
- `nycGovernmentData.ts` - specific to NYC civic data

**Expected Outcome:**
- Clear, domain-focused naming
- Easier for new developers to understand
- No temporal context in names

---

## Lower Priority Items (Cleanup When Touching Related Code)

### 5. Remove Excessive Suffixes

**Files:** Throughout codebase

**Examples:**
- `GraphNodeInfo` → `GraphNode`
- `GraphEdgeInfo` → `GraphEdge`
- `MainLayoutOptions` → `MainLayout`
- `SubviewLayoutConfig` → `SubviewLayout`

**When to fix:** Opportunistically when refactoring related code

---

### 6. Rename "Helper" Files

**Files:**
- `src/hooks/dataIndexHelpers.ts` → `src/hooks/dataIndexing.ts`
- Any other files with "Helper" in the name

**Why:** "Helper" is vague and meaningless

**When to fix:** When touching these files for other reasons

---

### 7. Consolidate or Inline "build" Functions

**Files:** Multiple files with excessive `build*` functions

**Examples:**
- `buildNodeScopeIndex` - trivial Map construction
- `buildNodesIndex` - trivial Map construction
- `buildEdgesIndex` - trivial Map construction

**Why:** Most are one-liners that could be inlined

**When to fix:** During code review or when modifying related code

---

### 8. Remove Implementation-Detail Comments

**Throughout codebase**

**Examples:**
- Comments about "new", "old", "legacy", "wrapper", "unified"
- Instructional comments telling developers what to do
- Comments explaining that something is "improved" or "better"

**Rule:** Comments should explain WHAT/WHY, not HOW or historical context

**When to fix:** As encountered during other work

---

## Completion Checklist

After completing each priority item:

- [ ] All TypeScript compilation passes
- [ ] Build succeeds (`npm run build`)
- [ ] Dev server runs without errors
- [ ] Manual testing of affected features
- [ ] Git commit with clear message
- [ ] Update this document to mark tasks complete

---

## Notes

- Priorities are ordered by impact and maintenance burden
- Lower priority items can be tackled opportunistically
- Always test after each change
- Commit frequently with clear messages
- Update this document as work progresses
