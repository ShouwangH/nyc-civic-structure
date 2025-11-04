# View Configuration Plan

This document plans ALL views in the system: Main, Inter, Intra, and Process views.

## Current State

**Total existing views**: 53
- 1 Main view (implicit in main.json)
- 35 Intra views (showing internal organizational structures)
- 17 Process views (showing process flows)
- **0 Inter views** (showing cross-entity relationships)

**What's Missing**: Inter views for all main nodes that have relationships to other entities.

---

## View Types

### Main View
- **Layout**: Hierarchical (constitutional/charter structure)
- **File**: main.json
- **Purpose**: Show the foundational legal structure
- **Status**: ✅ Exists

### Inter Views
- **Layout**: Network/force-directed (non-hierarchical relationships)
- **Purpose**: Show how a node relates to OTHER entities (proposes, enacts, oversees, appoints)
- **Status**: ❌ Need to create

### Intra Views
- **Layout**: Concentric (parallel divisions) or Hierarchical (personnel chains)
- **Purpose**: Show INTERNAL organizational structure
- **Status**: ✅ Mostly exist for agencies/departments, ❌ Missing for executive/legislative offices

### Process Views
- **Layout**: Sequential flow
- **Purpose**: Show step-by-step processes
- **Status**: ✅ Exist

---

## City Views Plan

### Main Nodes That Need Views

#### 1. NYC Charter (`city:nyc_charter`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: NYS constitution to charter, detailing home rule law
  - Layout: Hierarchical
  - includes: NYS constitution, cty charter 
- **Intra view**: ❌ None needed
- **Process views**: N/A

#### 2. Mayor (`city:mayor_nyc`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Proposes budget, appoints commissioners, oversees agencies
  - Layout: Force-directed network
  - Includes: Mayor, NYC Budget, City Council, Departments, Comptroller
- **Intra view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Mayor → Chief of Staff → Deputy Mayors → Policy advisors
  - Layout: Hierarchical
  - Status: Not in data - needs generation
- **Process views**: References mayoral_appointments process ✅

#### 3. Comptroller (`city:comptroller`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Audits budget, reviews agency spending, pension oversight
  - Layout: Force-directed network
  - Includes: Comptroller, NYC Budget, Mayor, Agencies
- **Intra view**: ✅ Exists (`comptroller_internal`)
  - Shows: 4 bureaus (Audit, Asset Management, Accountancy, Public Finance)
  - Layout: elk-mrtree
  - Anchor: `city:comptroller`
- **Process views**: References city_budget process ✅

#### 4. Public Advocate (`city:public_advocate`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Non-voting Council member, ombudsman to agencies, is second in line to Mayor
  - Layout: Force-directed network,
  - Includes: Public Advocate, City Council, Agencies, mayor
- **Intra view**: ❌ None needed (small office)
- **Process views**: Ombudsman process

#### 5. City Council (`city:city_council`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Enacts Administrative Code, approves budget, oversight of agencies
  - Layout: Force-directed network
  - Includes: Council, Administrative Code, NYC Budget, Mayor, Public Advocate, Agencies
- **Intra view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Speaker → Majority Leader → Committee Chairs → Members
  - Layout: Hierarchical
  - Status: Not in data - needs generation
- **Process views**: References local_law, city_budget processes ✅

#### 6. NYC Departments & Agencies (`city:departments`)
- **Inter view**: ❌ None needed
- **Intra view**: ✅ Exists (`city:departments` subview)
  - Shows: 43 departments
  - Layout: elk-mrtree
  - Anchor: `city:departments`
- **Process views**: References agency_rulemaking process ✅

#### 7. Administrative Code (`city:administrative_code`)
- **Inter view**: ❌ None needed
- **Intra view**: ❌ None needed
- **Process views**: References local_law process ✅

#### 8. Rules of the City (`city:rules_of_city`)
- **Inter view**: ❌ None needed
- **Intra view**: ❌ None needed
- **Process views**: References agency_rulemaking process ✅

#### 9. NYC Budget (`city:nyc_budget`)
- **Inter view**: ❌ None needed (will have various other views)
- **Intra view**: ❌ None needed (process view covers this)
- **Process views**: ✅ city_budget process exists

#### 10. Borough Structure (`city:borough_structure`)
- **Inter view**: ❌ None needed
- **Intra view**: Already shown in main view (5 borough presidents)
- **Process views**: N/A

#### 11-15. Borough Presidents (`city:bp_*`)
- **Inter view**: ❌ None needed
- **Intra view**: Already shown in main view (connection to Community Boards)
- **Process views**: References ulurp process ✅

#### 16-74. Community Boards (`city:cb_*`)
- **Inter view**: ❌ Low priority
- **Intra view**: ❌ Low priority
- **Process views**: References ulurp process ✅

### Intra Nodes (Departments) That Need Views

All major departments already have intra views showing their internal structure:
- ✅ NYPD (7 bureaus)
- ✅ DOE (6 divisions)
- ✅ FDNY (4 bureaus)
- ✅ DOHMH (4 bureaus)
- ✅ DHS (4 divisions)
- ✅ HPD (4 divisions)
- ✅ HRA (4 offices)
- ✅ DOT (4 divisions)
- ✅ DSNY (3 bureaus)
- ✅ OMB (4 units)

**Inter views for departments**: ⚠️ Could create (show reporting to Mayor, coordination with other agencies) - Medium priority

---

## State Views Plan

### Main Nodes That Need Views

#### 1. NY State Constitution (`state:ny_state_constitution`)
- **Inter view**: ❌ None needed
- **Intra view**: ❌ None needed
- **Process views**: N/A

#### 2. Governor (`state:governor_ny`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Proposes budget, appoints commissioners, signs/vetoes laws, appoints judges
  - Layout: Force-directed network
  - Includes: Governor, State Budget, State Agencies, State Legislature, Judiciary
- **Intra view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Governor → Lieutenant Governor → Secretary → Chief of Staff → Deputies
  - Layout: Hierarchical
  - Status: Not in data - needs generation
- **Process views**: References nys_budget, judicial_appointment processes ✅

#### 3. NY State Legislature (`state:state_legislature`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Enacts laws, adopts budget, creates authorities, confirms appointments
  - Layout: Force-directed network
  - Includes: Legislature, Consolidated Laws, State Budget, Public Authorities, Governor
- **Intra view**: Already shown in main view (Assembly + Senate)
- **Process views**: References nys_budget, bond_act, home_rule processes ✅

#### 4. State Assembly (`state:state_assembly`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Enacts laws with Senate, part of budget process
  - Layout: Force-directed network
  - Includes: Assembly, Senate, Governor, Consolidated Laws, State Budget
- **Intra view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Speaker → Majority Leader → Committee Chairs → 150 Members
  - Layout: Hierarchical
  - Status: Not in data - needs generation
- **Process views**: References nys_budget, bond_act processes ✅

#### 5. State Senate (`state:state_senate`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Enacts laws with Assembly, confirms appointments
  - Layout: Force-directed network
  - Includes: Senate, Assembly, Governor, Consolidated Laws
- **Intra view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Majority Leader → Committee Chairs → 63 Senators
  - Layout: Hierarchical
  - Status: Not in data - needs generation
- **Process views**: References nys_budget, judicial_appointment processes ✅

#### 6. State Judicial System (`state:state_judiciary`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Judges appointed by Governor, elected by voters, administrative oversight
  - Layout: Force-directed network
  - Includes: Judiciary, Governor, Commission on Judicial Nomination, Voters
- **Intra view**: ✅ Exists (`state:state_judiciary` subview)
  - Shows: Full court hierarchy (14 nodes)
  - Layout: elk-mrtree
  - Anchor: `state:state_judiciary`
- **Process views**: References judicial_appointment process ✅

#### 7. State Comptroller (`state:state_comptroller`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Audits budget, audits agencies, audits local governments, manages pension
  - Layout: Force-directed network
  - Includes: Comptroller, State Budget, State Agencies, NYC Charter
- **Intra view**: ✅ Exists (`state_comptroller_internal`)
  - Shows: 4 offices
  - Layout: elk-mrtree
  - Anchor: `state:state_comptroller`
- **Process views**: References nys_budget process ✅

#### 8. State Budget (`state:state_budget`)
- **Inter view**: ❌ None needed (multiple special views, not in scope)
- **Intra view**: ❌ None needed
- **Process views**: ✅ nys_budget process exists

#### 9. Consolidated Laws (`state:ny_consolidated_laws`)
- **Inter view**: ❌ None needed
- **Intra view**: ❌ None needed
- **Process views**: N/A

#### 10. NYCRR (`state:nycrr`)
- **Inter view**: ❌ None needed
- **Intra view**: ❌ None needed
- **Process views**: References state_rulemaking process ✅

#### 11. State Agencies (`state:state_agencies`)
- **Inter view**: ❌ None needed
- **Intra view**: ✅ Exists (`state:state_agencies` subview)
  - Shows: 27 agencies
  - Layout: elk-mrtree
  - Anchor: `state:state_agencies`
- **Process views**: References state_rulemaking process ✅

#### 12. Public Authorities (`state:public_authorities`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Created by Legislature, governance varies
  - Layout: Force-directed network
  - Includes: Public Authorities, Legislature, Mayor, Governor
- **Intra view**: Already shown in main view (9 authorities)
- **Process views**: N/A

#### 13-21. Individual Authorities (MTA, Port Authority, etc.)
- **Inter view**: Whoever appoint members and head
- **Intra view**: ❌ Not in current scope
- **Process views**: N/A

### Intra Nodes (Agencies) That Need Views

State agencies with existing intra views:
- ✅ State Police (3 divisions)
- ✅ DOT (4 offices)
- ✅ DEC (5 divisions)
- ✅ Health (4 offices)
- ✅ Education (4 offices)
- ✅ Labor (4 divisions)
- ✅ Attorney General (3 divisions)
- ✅ Parks (3 divisions)
- ✅ Agriculture (3 divisions)
- ✅ Budget Division (3 offices)

**Inter views for agencies**: ⚠️ Could create - Medium priority

---

## Federal Views Plan

### Main Nodes That Need Views

#### 1. U.S. Constitution (`federal:us_constitution`)
- **Inter view**: ❌ None needed
- **Intra view**: ❌ None needed
- **Process views**: N/A

#### 2. President (`federal:president`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Proposes budget, appoints Cabinet/judges, Commander-in-Chief, signs/vetoes
  - Layout: Force-directed network
  - Includes: President, Federal Budget, Federal Agencies, Congress, Supreme Court, Military
- **Intra view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: President → VP → Chief of Staff → Senior Advisors → OMB/NSC/etc.
  - Layout: Hierarchical
  - Status: Not in data - needs generation
- **Process views**: References federal_budget, impeachment processes ✅

#### 3. U.S. Congress (`federal:congress`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Enacts laws, enacts budget, confirms appointments (Senate), impeachment
  - Layout: Force-directed network
  - Includes: Congress, US Code, Federal Budget, President, Agencies
- **Intra view**: Already shown in main view (Senate + House)
- **Process views**: References federal_budget, federal_rulemaking, impeachment processes ✅

#### 4. U.S. Senate (`federal:senate`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Enacts laws with House, confirms appointments, ratifies treaties
  - Layout: Force-directed network
  - Includes: Senate, House, President, US Code
- **Intra view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: VP → President Pro Tem → Majority/Minority Leaders → Committees → 100 Senators
  - Layout: Hierarchical
  - Status: Not in data - needs generation
- **Process views**: References federal_budget, impeachment processes ✅

#### 5. U.S. House (`federal:house_of_representatives`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Enacts laws with Senate, originates revenue bills, impeachment power
  - Layout: Force-directed network
  - Includes: House, Senate, President, US Code, Federal Budget
- **Intra view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Speaker → Majority/Minority Leaders → Committee Chairs → 435 Members
  - Layout: Hierarchical
  - Status: Not in data - needs generation
- **Process views**: References federal_budget, impeachment processes ✅

#### 6. Supreme Court (`federal:supreme_court`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Justices appointed by President, confirmed by Senate, reviews lower courts
  - Layout: Force-directed network
  - Includes: Supreme Court, President, Senate, Federal Courts
- **Intra view**: ⚠️ Could create (Chief Justice + 8 Associate Justices) - Low priority
- **Process views**: N/A

#### 7. Federal Court System (`federal:federal_courts`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Overseen by Supreme Court, judges appointed by President/confirmed by Senate
  - Layout: Force-directed network
- **Intra view**: ⚠️ Could create (13 Circuits → 94 Districts) - Medium priority
- **Process views**: N/A

#### 8. Federal Budget (`federal:federal_budget`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Proposed by President, enacted by Congress
  - Layout: Force-directed network
  - Includes: Budget, President, Congress
- **Intra view**: ❌ None needed
- **Process views**: ✅ federal_budget process exists

#### 9. Federal Agencies (`federal:federal_agencies`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Overseen by President, secretaries appointed/confirmed, promulgate CFR
  - Layout: Force-directed network
  - Includes: Agencies, President, Senate, CFR
- **Intra view**: ✅ Exists (`federal:federal_agencies` subview)
  - Shows: 29 agencies
  - Layout: elk-mrtree
  - Anchor: `federal:federal_agencies`
- **Process views**: References federal_rulemaking, federal_grant processes ✅

#### 10. United States Code (`federal:us_code`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Enacted by Senate + House, signed by President
  - Layout: Force-directed network
- **Intra view**: ❌ None needed
- **Process views**: N/A

#### 11. CFR (`federal:cfr`)
- **Inter view**: ⚠️ **NEEDS TO BE CREATED**
  - Shows: Promulgated by agencies, based on US Code
  - Layout: Force-directed network
- **Intra view**: ❌ None needed
- **Process views**: References federal_rulemaking process ✅

### Intra Nodes (Agencies) That Need Views

Federal agencies with existing intra views:
- ✅ DoD (6 branches/agencies)
- ✅ State Dept (4 bureaus)
- ✅ Treasury (4 agencies)
- ✅ DOJ (5 agencies)
- ✅ HHS (4 agencies)
- ✅ Education (4 offices)
- ✅ Transportation (4 administrations)
- ✅ DHS (6 agencies)
- ✅ EPA (4 offices)

**Inter views for agencies**: ⚠️ Could create - Medium priority

---

## Priority Summary

### High Priority - MUST CREATE

**Inter views for main constitutional/charter nodes**:
1. City: Mayor, Comptroller, City Council, Departments (4 views)
2. State: Governor, Legislature, Assembly, Senate, Comptroller (5 views)
3. Federal: President, Congress, Senate, House (4 views)

**Total: 13 inter views**

**Intra views for executive/legislative offices**:
1. City: Mayor's Office, City Council (2 views)
2. State: Governor's Office, Assembly, Senate (3 views)
3. Federal: White House, Senate, House (3 views)

**Total: 8 intra views**

**Grand total HIGH PRIORITY: 21 new views**

### Medium Priority - SHOULD CREATE

**Inter views for laws/budgets/agencies**:
- All laws nodes (Administrative Code, Consolidated Laws, US Code, etc.) - ~9 views
- All budget nodes - ~3 views
- Category nodes (Departments, Agencies) - ~3 views

**Total: ~15 inter views**

**Inter views for major departments/agencies**:
- Show reporting relationships and coordination with other entities
- ~25 views

### Low Priority - COULD CREATE

- Inter views for individual authorities, community boards, etc.
- Intra views for small offices
- Intra views for courts/judges

---

## Implementation Strategy

### Phase 1: Create Inter View Structure
1. Add "inter" view type to SubviewDefinition type
2. Create inter views for all main nodes with cross-entity relationships
3. Store in {jurisdiction}-inter.json files (new files)

### Phase 2: Generate Missing Intra Views
1. Mayor's Office → Chief of Staff hierarchy
2. Governor's Office → Secretary hierarchy
3. President's Office → Chief of Staff hierarchy
4. Legislative body leadership structures

### Phase 3: Add Inter Views for Supporting Nodes
1. Laws (Administrative Code, etc.)
2. Budgets
3. Category nodes

### Phase 4: Polish and Add Lower Priority Views
1. Agency inter views
2. Authority inter views
3. Court structure expansions

---

## File Structure Proposal

```
data/
  main.json                    # Main view (1 view)

  city-intra.json              # City intra views (12 existing + 2 new = 14)
  city-inter.json              # City inter views (NEW: ~13 views)
  city-processes.json          # City process views (7 existing)

  state-intra.json             # State intra views (13 existing + 3 new = 16)
  state-inter.json             # State inter views (NEW: ~15 views)
  state-processes.json         # State process views (6 existing)

  federal-intra.json           # Federal intra views (10 existing + 3 new = 13)
  federal-inter.json           # Federal inter views (NEW: ~13 views)
  federal-processes.json       # Federal process views (4 existing)
```

**Total files**: 10 (1 main + 9 jurisdiction-specific)
**Total views**: ~115 views
  - 1 main
  - ~43 intra views
  - ~41 inter views
  - ~17 process views
  - Plus lower priority additions
