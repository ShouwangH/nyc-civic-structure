# Data Migration Plan

## Goal

Restructure data files so that subview configurations live with their anchor nodes:
- **main.json**: Main nodes + main edges + subviews anchored to main nodes
- **{jurisdiction}-intra.json**: Intra nodes (1st & 2nd level children) + intra edges + subviews anchored to intra nodes
- No {jurisdiction}-intra-detailed needed (no 3rd level nesting currently)

## Current State Issues

1. **Subviews in wrong files**: Some subviews anchored to main nodes are in intra files
2. **Missing personnel hierarchies**: LLM-generated nodes/edges not yet integrated
3. **Scattered view configs**: Hard to find which views belong to which nodes

## Target Structure

### main.json
```
{
  "meta": { ... },
  "nodes": [ /* all main-level nodes */ ],
  "edges": [ /* edges between main nodes */ ],
  "subviews": [
    /* ALL subviews where anchor.nodeId is in main.json */
    /* This includes intra views that show internal structures of main nodes */
  ]
}
```

### city-intra.json (and state/federal)
```
{
  "meta": { ... },
  "nodes": [
    /* All nodes that are children of main nodes */
    /* Plus grandchildren (children of intra nodes) */
  ],
  "edges": [
    /* All edges between intra nodes */
    /* Plus edges from main nodes to intra nodes */
  ],
  "subviews": [
    /* ALL subviews where anchor.nodeId is an intra node */
    /* e.g., NYPD → bureaus, DOE → divisions */
  ]
}
```

## Migration Steps

### Step 1: Backup Current Data
- Create `data/backup-pre-migration-YYYY-MM-DD/`
- Copy all current data files

### Step 2: Load All Data
- Read main.json
- Read city-intra.json, state-intra.json, federal-intra.json
- Read all generated intraagency files
- Build complete node and edge indexes

### Step 3: Categorize Nodes
- **Main nodes**: Already defined in main.json
- **Intra nodes (Level 1)**: Direct children of main nodes (exist in current intra files)
- **Intra nodes (Level 2)**: Children of Level 1 intra nodes (exist in current intra files or generated)
- **Verify no Level 3**: Confirm no further nesting exists

### Step 4: Reorganize Subviews by Anchor
For each subview:
1. Check `subview.anchor.nodeId`
2. If anchor is in main nodes → goes to main.json
3. If anchor is in intra nodes → goes to {jurisdiction}-intra.json

Current subviews to migrate TO main.json:
- `city:departments` subview (anchor: `city:departments` - IS in main)
- `state:state_agencies` subview (anchor: `state:state_agencies` - IS in main)
- `state:state_judiciary` subview (anchor: `state:state_judiciary` - IS in main)
- `federal:federal_agencies` subview (anchor: `federal:federal_agencies` - IS in main)

Subviews to KEEP in intra files:
- All agency-specific subviews (NYPD, DOE, FDNY, etc.) - anchors are intra nodes

### Step 5: Add New Generated Content
From `.claude/generated/intraagency/`:
1. Extract nodes and edges
2. Add to appropriate intra files
3. Create subview configurations with generated edges
4. Add subviews to main.json (since anchors are main nodes like `city:mayor_nyc`)

### Step 6: Build New Inter Subviews
Add the inter subviews we created:
- NYC Charter home rule
- Public Advocate relationships
- Public Authorities governance
- State Comptroller oversight

All go to main.json (anchors are main nodes)

### Step 7: Validate
- Ensure all node IDs are unique
- Ensure all edge source/target nodes exist
- Ensure all subview anchor nodes exist
- Ensure no orphaned nodes
- Verify jurisdiction prefixes are correct

### Step 8: Write New Files
- Write new main.json
- Write new city-intra.json, state-intra.json, federal-intra.json
- Preserve city-processes.json, state-processes.json, federal-processes.json (no changes)

## Detailed Subview Migration

### Subviews Moving TO main.json

From city-intra.json:
- `city:departments` subview → MOVE to main.json
  - Anchor: `city:departments` (main node)
  - Shows all 43 city departments

From state-intra.json:
- `state:state_agencies` subview → MOVE to main.json
  - Anchor: `state:state_agencies` (main node)
  - Shows all 27 state agencies
- `state:state_judiciary` subview → MOVE to main.json
  - Anchor: `state:state_judiciary` (main node)
  - Shows court hierarchy

From federal-intra.json:
- `federal:federal_agencies` subview → MOVE to main.json
  - Anchor: `federal:federal_agencies` (main node)
  - Shows all 29 federal agencies

### New Subviews Adding TO main.json

From generated files:
- `city:mayor_office_internal` → ADD to main.json
  - Anchor: `city:mayor_nyc` (main node)
- `city:council_internal` → ADD to main.json
  - Anchor: `city:city_council` (main node)
- `state:governor_office_internal` → ADD to main.json
  - Anchor: `state:governor_ny` (main node)
- `state:assembly_internal` → ADD to main.json
  - Anchor: `state:state_assembly` (main node)
- `state:senate_internal` → ADD to main.json
  - Anchor: `state:state_senate` (main node)
- `federal:white_house_internal` → ADD to main.json
  - Anchor: `federal:president` (main node)
- `federal:senate_internal` → ADD to main.json
  - Anchor: `federal:senate` (main node)
- `federal:house_internal` → ADD to main.json
  - Anchor: `federal:house_of_representatives` (main node)

Plus inter views:
- `city:charter_home_rule` → ADD to main.json
- `city:public_advocate_relationships` → ADD to main.json
- `state:public_authorities_governance` → ADD to main.json
- `state:comptroller_oversight` → ADD to main.json

### Subviews Staying IN intra files

All agency-specific subviews remain in intra files (anchors are intra nodes):
- City: NYPD, DOE, FDNY, DOHMH, DHS, HPD, HRA, DOT, DSNY, OMB, Comptroller
- State: State Police, DOT, DEC, Health, Education, Labor, AG, Comptroller, Parks, Agriculture, Budget
- Federal: DoD, State Dept, Treasury, DOJ, HHS, Education, DOT, DHS, EPA

## Expected Results

### File Counts
- Before: 1 main + 3 intra + 3 processes = 7 files
- After: 1 main + 3 intra + 3 processes = 7 files (same count, better organization)

### Subview Counts

**main.json**:
- Before: 0 subviews
- After: ~16 subviews
  - 4 category subviews (departments, state agencies, state judiciary, federal agencies)
  - 8 personnel hierarchy subviews (mayor, council, governor, assembly, senate, president, senate, house)
  - 4 inter views (charter, public advocate, authorities, comptroller)

**city-intra.json**:
- Before: 12 subviews
- After: 11 subviews (departments moved out, mayor/council added but they go to main)

**state-intra.json**:
- Before: 13 subviews
- After: 11 subviews (state agencies and judiciary moved out)

**federal-intra.json**:
- Before: 10 subviews
- After: 9 subviews (federal agencies moved out)

## Risk Mitigation

1. **Backup before migration**: Full backup to `data/backup-pre-migration-YYYY-MM-DD/`
2. **Dry run first**: Script outputs validation report before writing
3. **Git commit checkpoint**: Commit before running migration
4. **Validation checks**: Script validates all references
5. **Rollback plan**: Keep backups, can revert via git

## Success Criteria

- ✅ All subviews are in the correct file (based on anchor location)
- ✅ All generated nodes and edges are integrated
- ✅ No duplicate nodes or edges
- ✅ All node references are valid
- ✅ All subview anchors exist
- ✅ Codebase can load and display all views correctly
