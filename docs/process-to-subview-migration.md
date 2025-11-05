# Process to Subview Migration Plan

## Goal

Convert all `ProcessDefinition` objects to workflow-type `SubviewDefinition` objects, eliminating the parallel process/subgraph systems and creating a single unified subview system.

## Current Problem

We have TWO separate but parallel systems:
1. **Processes** - `ProcessDefinition` → `highlightProcess()` API → `processController`
2. **Subgraphs** - `SubviewDefinition` → `handlers.activateSubview()` → `subviewController` → routes to appropriate controller

This creates:
- Duplicate state fields (`activeProcessId` vs `activeSubviewId`)
- Duplicate APIs (legacy process API vs imperative handlers)
- Hybrid ControlsPanel with different patterns for processes vs subgraphs
- Cannot complete consolidation plan while processes remain separate

## The Solution

**Convert processes to workflow-type subviews at the data layer**, then everything flows through the unified system:

```
ProcessDefinition (data)
  ↓ Convert to SubviewDefinition with type: 'workflow'
  ↓ Add to subviewById map
  ↓
User clicks process button
  ↓
handlers.activateSubview(processId)  ← Same as subgraphs!
  ↓
subviewController.activate(subview)
  ↓
Check type === 'workflow'? → processController.show()  ← Existing routing!
```

**Result:** Single unified pattern, no special cases.

---

## Implementation Plan

### Phase 0: Preparation (10 min)

**Create todo list and backup:**
- [ ] Create backup of data files (git commit current state)
- [ ] Document current ProcessDefinition structure
- [ ] Document current SubviewDefinition structure
- [ ] Verify SubviewController already handles workflow type correctly

**Files to understand:**
- `src/data/types.ts` - Type definitions
- `src/data/graphDataPipeline.ts` - Data loading and transformation
- `src/graph/subview-controller.ts` - Routing logic (already supports workflow!)

---

### Phase 1: Add Conversion Function (30 min)

**Goal:** Create function to convert ProcessDefinition → SubviewDefinition

**Changes:**
- [ ] Create `convertProcessToSubview()` function in graphDataPipeline.ts
- [ ] Map ProcessDefinition fields to SubviewDefinition fields:
  - `id` → `id`
  - `label` → `label`
  - `description` → `description`
  - `type` → `'workflow'` (hardcoded)
  - `nodes` → `nodes`
  - `edges` → `edges` (may need format adjustment)
  - `steps` → `metadata.steps`
  - `anchor` → First node in process

**Edge format check:**
```typescript
// ProcessDefinition edge:
{ source: string, target: string }

// SubviewDefinition edge:
{ source: string, target: string, label?: string, relation?: string, detail?: string }
```

If compatible, can map directly. If not, add label field.

**Testing:**
- [ ] Verify conversion produces valid SubviewDefinition
- [ ] Log converted subviews to console
- [ ] Check all required fields are present

---

### Phase 2: Update Data Pipeline (20 min)

**Goal:** Convert all processes and add them to subviewById map

**Changes:**
- [ ] In graphDataPipeline.ts, after loading processes:
  ```typescript
  // Convert processes to workflow-type subviews
  const processSubviews: SubviewDefinition[] = processes.map(convertProcessToSubview);

  // Merge with existing subviews
  const allSubviews = [...subviews, ...processSubviews];
  ```

- [ ] Update `subviewById` map to include process subviews
- [ ] Update `subviewByAnchorId` map to include process anchors
- [ ] Keep original `processes` array for now (backward compatibility during transition)

**Testing:**
- [ ] Verify `subviewById.size` increases by number of processes
- [ ] Log `subviewById` map to verify processes are present
- [ ] Check process IDs are unique (no collisions with subgraph IDs)

---

### Phase 3: Update ControlsPanel (15 min)

**Goal:** Make process buttons use handlers.activateSubview() like subgraph buttons

**Changes:**
- [ ] Replace process button onClick handler:
  ```typescript
  // BEFORE:
  onClick={() => {
    const graphHandle = graphRef.current;
    if (!graphHandle) return;
    if (isActive) {
      void graphHandle.clearProcessHighlight();
    } else {
      void graphHandle.highlightProcess(process.id);
    }
  }}

  // AFTER:
  onClick={() => {
    const handlers = graphRef.current?.handlers;
    if (!handlers) return;
    if (isActive) {
      void handlers.deactivateAll();
    } else {
      void handlers.activateSubview(process.id);
    }
  }}
  ```

- [ ] Process buttons now use SAME pattern as subgraph buttons
- [ ] Remove `activeProcessId` prop usage from ControlsPanel (use activeSubviewId instead)

**Testing:**
- [ ] Build succeeds (no TypeScript errors)
- [ ] Process buttons render correctly
- [ ] Clicking process button calls activateSubview()

---

### Phase 4: Update State Management (30 min)

**Goal:** Remove activeProcessId, use only activeSubviewId

**Changes in `src/state/useVisualizationState.ts`:**

1. Remove legacy fields from state type:
   - [ ] Remove `activeProcessId: string | null`
   - [ ] Remove `activeSubgraphId: string | null`
   - [ ] Keep `activeSubviewId: string | null` (unified field)

2. Update initialState:
   - [ ] Remove activeProcessId and activeSubgraphId

3. Update reducer cases:
   - [ ] `PROCESS_TOGGLED` - Can likely delete this case
   - [ ] `SUBGRAPH_TOGGLED` - Can likely delete this case
   - [ ] These are now handled by imperative handlers syncing activeSubviewId

4. Update derived selectors:
   - [ ] Change `activeProcess` to look up from subviewById instead of processes
   - [ ] Remove `activeSubgraphId` checks, use `activeSubviewId`
   - [ ] Update sidebar logic to show subview label for both workflows and subgraphs

**Testing:**
- [ ] Build succeeds
- [ ] Check React DevTools: state should only have activeSubviewId
- [ ] Verify sidebar displays correctly for both processes and subgraphs

---

### Phase 5: Update App.tsx (10 min)

**Goal:** Remove process-specific props and state references

**Changes:**
- [ ] Remove `activeProcessId` from destructured state
- [ ] Update ControlsPanel props:
  - Remove `activeProcessId` prop
  - Update `activeSubgraphId` → `activeSubviewId` (or keep both during transition)
- [ ] Verify all process interactions now flow through handlers

**Testing:**
- [ ] Build succeeds
- [ ] App renders without errors
- [ ] ControlsPanel receives correct props

---

### Phase 6: Testing & Verification (30 min)

**Manual Testing Checklist:**
1. [ ] Load app - verify no console errors
2. [ ] Click a process button - verify process activates
3. [ ] Click same process button - verify toggle off works
4. [ ] Click different process button - verify switch works
5. [ ] Change scope, click process - verify works in new scope
6. [ ] Click a subgraph button - verify subgraph activates
7. [ ] Switch between process and subgraph - verify mutual exclusivity
8. [ ] Click node with workflow subview anchor - verify activates
9. [ ] Click background - verify deactivates everything
10. [ ] Check sidebar - verify displays correct info for both processes and subgraphs

**State Verification:**
- [ ] Open React DevTools
- [ ] Verify `activeSubviewId` updates when clicking processes
- [ ] Verify `activeProcessId` no longer exists in state
- [ ] Verify `activeSubgraphId` no longer exists in state (or is deprecated)

**Console Verification:**
- [ ] No errors in console
- [ ] SubviewController logs show "workflow" type routing
- [ ] ProcessController.show() is called for workflow subviews

---

### Phase 7: Cleanup Legacy Code (20 min)

**Now that processes are unified, remove unused code:**

1. Remove legacy process API from orchestrator:
   - [ ] Remove `highlightProcess()` function
   - [ ] Remove `clearProcessHighlight()` function
   - [ ] Remove from GraphRuntime type

2. Remove legacy process API from GraphCanvas:
   - [ ] Remove `highlightProcess` from GraphCanvasHandle
   - [ ] Remove `clearProcessHighlight` from GraphCanvasHandle
   - [ ] Remove from useImperativeHandle

3. Remove legacy GraphController process methods:
   - [ ] Remove `showProcess()` from GraphController
   - [ ] Remove `clearProcessHighlight()` from GraphController
   - [ ] Remove from controller.ts

4. Search for remaining references:
   - [ ] Grep for `highlightProcess` - should only find test files
   - [ ] Grep for `activeProcessId` - should only find migration notes
   - [ ] Update or remove any remaining references

**Testing:**
- [ ] Build succeeds
- [ ] All manual tests still pass
- [ ] No console errors

---

### Phase 8: Update useGraphEffects (10 min)

**Goal:** Remove process-specific logic, watch only activeSubviewId

**Changes in `src/hooks/useGraphEffects.ts`:**
- [ ] Remove `processChanged` detection
- [ ] Remove `state.activeProcessId` checks
- [ ] Remove `graphHandle.highlightProcess()` calls
- [ ] Watch only `activeSubviewId` changes
- [ ] Simplify logic now that everything is unified

**Note:** We might be able to delete this entire file in Phase 2 of the consolidation plan, but for now just simplify it.

**Testing:**
- [ ] Process activations still work via handlers
- [ ] Scope changes still work
- [ ] No regressions

---

## Success Criteria

**After completing all phases:**

✅ **Data Layer:**
- All processes converted to SubviewDefinition with type: 'workflow'
- Processes appear in subviewById map
- Processes have anchors in subviewByAnchorId map

✅ **UI Layer:**
- ControlsPanel uses single pattern for all buttons
- All buttons call `handlers.activateSubview(id)`
- No special-case logic for processes

✅ **State Layer:**
- Only `activeSubviewId` field (no activeProcessId/activeSubgraphId)
- State updates correctly for both workflows and subgraphs
- Sidebar displays correctly for both types

✅ **Controller Layer:**
- SubviewController routes workflow type → ProcessController
- ProcessController receives converted SubviewDefinitions
- No direct process API calls remain

✅ **Code Quality:**
- ~150 lines of legacy process API removed
- Single execution path for all subview types
- No hybrid patterns
- Build succeeds, no TypeScript errors
- All manual tests pass

---

## Rollback Plan

If we encounter issues:

1. **Revert git commits** - Each phase should be committed separately
2. **Keep original processes array** - Don't delete until fully verified
3. **Feature flag** - Can add `USE_UNIFIED_SUBVIEWS` flag if needed during transition

---

## Risks & Mitigation

**Risk 1: Process edge format incompatible with SubviewDefinition**
- **Mitigation:** Check format in Phase 1, add adapter if needed

**Risk 2: ProcessController expects different data structure**
- **Mitigation:** SubviewController already converts SubviewDefinition → ProcessDefinition in convertToProcessDefinition(), so should work

**Risk 3: Process anchors don't work as expected**
- **Mitigation:** Test anchor behavior in Phase 2, adjust anchor selection if needed

**Risk 4: State updates break sidebar display**
- **Mitigation:** Test sidebar thoroughly in Phase 6, update derived selectors as needed

---

## Timeline Estimate

| Phase | Estimated Time | Cumulative |
|-------|---------------|------------|
| Phase 0: Preparation | 10 min | 10 min |
| Phase 1: Conversion Function | 30 min | 40 min |
| Phase 2: Data Pipeline | 20 min | 60 min |
| Phase 3: ControlsPanel | 15 min | 75 min |
| Phase 4: State Management | 30 min | 105 min |
| Phase 5: App.tsx | 10 min | 115 min |
| Phase 6: Testing | 30 min | 145 min |
| Phase 7: Cleanup | 20 min | 165 min |
| Phase 8: useGraphEffects | 10 min | 175 min |
| **Total** | **~3 hours** | |

**Realistic estimate with breaks and debugging: 4-5 hours**

---

## Next Steps

After this refactor is complete, we can resume the consolidation plan:
- Phase 2: Remove useGraphEffects entirely (now much simpler)
- Phase 3-7: Continue with cleanup phases
- Final result: Single unified subview system, no legacy paths
