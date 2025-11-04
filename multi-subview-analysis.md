# Multiple Subviews Per Node - Current State & Handling

## Which Nodes Have Both Inter and Intra Views?

### Currently Implemented (in data files)

Only **1 node** currently has both inter and intra views:

**`state:state_comptroller`** (State Comptroller)
- **Intra view**: `state_comptroller_internal`
  - Shows: 4 internal offices/bureaus
  - Type: organizational hierarchy
- **Inter view**: `state:comptroller_oversight`
  - Shows: Audit relationships to state budget, agencies, and NYC
  - Type: cross-entity relationships

### Planned (from view-configuration-plan.md)

The following nodes are **planned** to have both inter and intra views, but the inter views haven't been created yet:

**City:**
1. `city:mayor_nyc` - Mayor
   - Intra: ✅ `city:mayor_office_internal` (Chief of Staff → Deputy Mayors)
   - Inter: ⚠️ Not created (proposes budget, appoints commissioners, oversees agencies)

2. `city:comptroller` - Comptroller
   - Intra: ✅ `comptroller_internal` (4 bureaus)
   - Inter: ⚠️ Not created (audits budget, reviews spending)

3. `city:city_council` - City Council
   - Intra: ✅ `city:council_internal` (Speaker → Committees)
   - Inter: ⚠️ Not created (enacts laws, approves budget)

**State:**
4. `state:governor_ny` - Governor
   - Intra: ✅ `state:governor_office_internal` (Secretary → Chief of Staff → Deputies)
   - Inter: ⚠️ Not created (proposes budget, appoints commissioners, signs laws)

5. `state:state_assembly` - State Assembly
   - Intra: ✅ `state:assembly_internal` (Speaker → Committees)
   - Inter: ⚠️ Not created (enacts laws with Senate)

6. `state:state_senate` - State Senate
   - Intra: ✅ `state:senate_internal` (Majority Leader → Committees)
   - Inter: ⚠️ Not created (confirms appointments, enacts laws)

7. `state:state_judiciary` - State Judiciary
   - Intra: ✅ `state:state_judiciary` (court hierarchy)
   - Inter: ⚠️ Not created (appointments by Governor, elections)

8. `state:state_comptroller` - State Comptroller ✅ **ONLY ONE WITH BOTH IMPLEMENTED**
   - Intra: ✅ `state_comptroller_internal`
   - Inter: ✅ `state:comptroller_oversight`

**Federal:**
None planned with both inter and intra.

## How the System Currently Handles Multiple Subviews

### Current Implementation: **Only One Subview Per Anchor** ❌

**Code Location**: [src/hooks/dataIndexHelpers.ts:39-46](src/hooks/dataIndexHelpers.ts#L39-L46)

```typescript
export const buildSubgraphByEntryId = (
  subgraphConfigs: SubgraphConfig[]
): Map<string, SubgraphConfig> => {
  const map = new Map<string, SubgraphConfig>();
  subgraphConfigs.forEach((config) => {
    map.set(config.meta.entryNodeId, config);  // ⚠️ Overwrites if duplicate
  });
  return map;
};
```

**Problem**: If multiple subviews share the same anchor node, later ones overwrite earlier ones.

**What happens when you click a node**: [src/state/useVisualizationState.ts:34](src/state/useVisualizationState.ts#L34)

```typescript
case 'NODE_CLICKED': {
  if (action.isSubgraphEntry) {
    const subgraphId = GRAPH_DATA.maps.subgraphByEntryId.get(action.nodeId)?.meta.id;
    if (subgraphId) {
      // Activate the ONE subgraph found in the map
      return { ...state, activeSubgraphId: subgraphId };
    }
  }
}
```

### Which Subview "Wins" Currently?

For `state:state_comptroller` (the only node with both):
- Both subviews are in main.json (not split between main and intra files)
- `state_comptroller_internal` (intra) appears at index 2
- `state:comptroller_oversight` (inter) appears at index 17
- Later index overwrites earlier in the Map
- **Result**: `state:comptroller_oversight` (inter view) is the one accessible when clicking

**Actual behavior**: When you click `state:state_comptroller`, you see the inter view (oversight relationships), NOT the intra view (internal bureaus).

## Options to Support Multiple Subviews

### Option 1: Change Map to Multi-Map (Map to Array)

Change `subgraphByEntryId` from `Map<string, SubgraphConfig>` to `Map<string, SubgraphConfig[]>`:

**Changes needed**:
1. Update `buildSubgraphByEntryId()` to accumulate configs in arrays
2. Update UI to show a menu/list when multiple subviews exist for a node
3. User chooses which view to activate

**Pros**:
- Preserves all subviews
- User gets choice

**Cons**:
- Requires UI changes
- More complex interaction pattern

### Option 2: Prioritize View Types (Current Behavior Enhanced)

Keep single view per node but make the priority explicit:
- Intra views take precedence (internal structure is more common use case)
- Inter views available separately (maybe via sidebar or different interaction)

**Pros**:
- Minimal code changes
- Clear behavior

**Cons**:
- One view type is hidden/harder to access

### Option 3: Different Triggers for Different View Types

- Single click → Intra view (if exists)
- Double click → Inter view (if exists)
- Right click → Menu with all available views

**Pros**:
- All views accessible
- Discoverable through interaction

**Cons**:
- Requires implementing multiple interaction types

### Option 4: Sidebar Integration

Show all available views in the sidebar when a node is selected:
- Click node → selects it, shows info in sidebar
- Sidebar shows buttons/links for all available views
- Click view button → activates that view

**Pros**:
- Clean separation of selection vs activation
- Sidebar already exists
- All views equally accessible

**Cons**:
- Changes interaction model (click doesn't immediately activate view)

## Recommendation

Given the current architecture and the fact that only **1 node currently** has multiple views (with 6 more planned), I recommend:

**Short term**: Fix the priority order to be explicit:
1. Update `buildSubgraphByEntryId()` to prefer intra views over inter views
2. Document which view "wins" when conflicts occur
3. This gives us time to design the proper multi-view UX

**Long term** (when creating the 6 planned inter views):
Choose between:
- **Option 1** (multi-map + menu) - if we expect many nodes to have multiple views
- **Option 4** (sidebar integration) - if we're building out the sidebar anyway
- **Option 3** (interaction triggers) - if we want to keep it purely graph-based

## Current Status

✅ Only `state:state_comptroller` has both inter and intra implemented
⚠️ Whichever view is loaded last "wins" (likely the intra view)
⚠️ No UI for choosing between multiple views
⚠️ No explicit priority handling
