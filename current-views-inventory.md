# Current View Configurations Inventory

---

## Main View

**File**: main.json
**Type**: Main constitutional/charter view
**Nodes**: 61
**Edges**: 65
**Layout**: Not specified (defaults to hierarchical in main view)
**View configuration**: None explicitly defined - main.json is the default main view

---

## City Views

### City Intra Subviews

**File**: city-intra.json
**Total subviews**: 12

#### 1. NYPD Internal Structure (`nypd_internal`)
- **Type**: intra
- **Anchor**: `city:NYPD`
- **Nodes**: 8
- **Edges**: 7
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 2. DOE Internal Structure (`doe_internal`)
- **Type**: intra
- **Anchor**: `city:DOE`
- **Nodes**: 7
- **Edges**: 6
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 3. Comptroller Internal Structure (`comptroller_internal`)
- **Type**: intra
- **Anchor**: `city:comptroller`
- **Nodes**: 5
- **Edges**: 4
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 4. OMB Internal Structure (`omb_internal`)
- **Type**: intra
- **Anchor**: `city:OMB`
- **Nodes**: 5
- **Edges**: 4
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 5. FDNY Internal Structure (`fdny_internal`)
- **Type**: intra
- **Anchor**: `city:FDNY`
- **Nodes**: 5
- **Edges**: 4
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 6. DSNY Internal Structure (`dsny_internal`)
- **Type**: intra
- **Anchor**: `city:DSNY`
- **Nodes**: 4
- **Edges**: 3
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 7. DHS Internal Structure (`dhs_internal`)
- **Type**: intra
- **Anchor**: `city:DHS`
- **Nodes**: 5
- **Edges**: 4
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 8. HRA Internal Structure (`hra_internal`)
- **Type**: intra
- **Anchor**: `city:HRA`
- **Nodes**: 5
- **Edges**: 4
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 9. DOT Internal Structure (`dot_internal`)
- **Type**: intra
- **Anchor**: `city:DOT`
- **Nodes**: 5
- **Edges**: 4
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 10. HPD Internal Structure (`hpd_internal`)
- **Type**: intra
- **Anchor**: `city:HPD`
- **Nodes**: 5
- **Edges**: 4
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 11. DOHMH Internal Structure (`dohmh_internal`)
- **Type**: intra
- **Anchor**: `city:DOHMH`
- **Nodes**: 5
- **Edges**: 4
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 12. NYC Departments & Agencies (`city:departments`)
- **Type**: intra
- **Anchor**: `city:departments`
- **Nodes**: 44
- **Edges**: 85
- **Layout**: elk-mrtree

### City Process Views

**File**: city-processes.json
**Total processes**: 7

#### 1. ULURP (`ulurp`)
- **Type**: process
- **Nodes**: 5
- **Edges**: 4
- **Layout**: not specified

#### 2. City Budget Process (`city_budget`)
- **Type**: process
- **Nodes**: 5
- **Edges**: 5
- **Layout**: not specified

#### 3. City Charter Revision (`charter_revision`)
- **Type**: process
- **Nodes**: 4
- **Edges**: 3
- **Layout**: not specified

#### 4. Local Law Passage (`local_law`)
- **Type**: process
- **Nodes**: 4
- **Edges**: 4
- **Layout**: not specified

#### 5. Agency Rulemaking (CAPA) (`agency_rulemaking`)
- **Type**: process
- **Nodes**: 5
- **Edges**: 5
- **Layout**: not specified

#### 6. Mayoral Appointments (Advice & Consent) (`mayoral_appointments`)
- **Type**: process
- **Nodes**: 3
- **Edges**: 3
- **Layout**: not specified

#### 7. City Procurement Process (`procurement`)
- **Type**: process
- **Nodes**: 4
- **Edges**: 6
- **Layout**: not specified

---

## State Views

### State Intra Subviews

**File**: state-intra.json
**Total subviews**: 13

#### 1. State Police Internal Structure (`nysp_internal`)
- **Type**: intra
- **Anchor**: `state:state_police_ny`
- **Nodes**: 4
- **Edges**: 3
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 2. State DOT Internal Structure (`state_dot_internal`)
- **Type**: intra
- **Anchor**: `state:dot_ny`
- **Nodes**: 5
- **Edges**: 4
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 3. State DEC Internal Structure (`state_dec_internal`)
- **Type**: intra
- **Anchor**: `state:dec_ny`
- **Nodes**: 6
- **Edges**: 5
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 4. State Health Department Internal Structure (`state_health_internal`)
- **Type**: intra
- **Anchor**: `state:doh_ny`
- **Nodes**: 5
- **Edges**: 4
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 5. State Education Department Internal Structure (`state_education_internal`)
- **Type**: intra
- **Anchor**: `state:sed_ny`
- **Nodes**: 5
- **Edges**: 4
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 6. State Labor Department Internal Structure (`state_labor_internal`)
- **Type**: intra
- **Anchor**: `state:dol_ny`
- **Nodes**: 5
- **Edges**: 4
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 7. Attorney General Internal Structure (`state_ag_internal`)
- **Type**: intra
- **Anchor**: `state:attorney_general`
- **Nodes**: 4
- **Edges**: 3
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 8. State Comptroller Internal Structure (`state_comptroller_internal`)
- **Type**: intra
- **Anchor**: `state:state_comptroller`
- **Nodes**: 5
- **Edges**: 4
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 9. State Parks Internal Structure (`state_parks_internal`)
- **Type**: intra
- **Anchor**: `state:parks_ny`
- **Nodes**: 4
- **Edges**: 3
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 10. State Agriculture & Markets Internal Structure (`state_agriculture_internal`)
- **Type**: intra
- **Anchor**: `state:agm_ny`
- **Nodes**: 4
- **Edges**: 3
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 11. State Budget Division Internal Structure (`state_budget_internal`)
- **Type**: intra
- **Anchor**: `state:division_of_budget`
- **Nodes**: 4
- **Edges**: 3
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 12. Core State Agencies (`state:state_agencies`)
- **Type**: intra
- **Anchor**: `state:state_agencies`
- **Nodes**: 29
- **Edges**: 55
- **Layout**: elk-mrtree

#### 13. State Judicial System (`state:state_judiciary`)
- **Type**: intra
- **Anchor**: `state:state_judiciary`
- **Nodes**: 14
- **Edges**: 13
- **Layout**: elk-mrtree

### State Process Views

**File**: state-processes.json
**Total processes**: 6

#### 1. NYS Budget Process (`nys_budget`)
- **Type**: process
- **Nodes**: 6
- **Edges**: 7
- **Layout**: not specified

#### 2. Judicial Appointment (Court of Appeals) (`judicial_appointment`)
- **Type**: process
- **Nodes**: 3
- **Edges**: 2
- **Layout**: not specified

#### 3. State Bond Act / Ballot Proposition (`bond_act`)
- **Type**: process
- **Nodes**: 4
- **Edges**: 3
- **Layout**: not specified

#### 4. Home Rule Request (`home_rule`)
- **Type**: process
- **Nodes**: 5
- **Edges**: 5
- **Layout**: not specified

#### 5. Mayoral Control of Schools Renewal (`mayoral_control_schools`)
- **Type**: process
- **Nodes**: 5
- **Edges**: 7
- **Layout**: not specified

#### 6. State Agency Rulemaking (SAPA) (`state_rulemaking`)
- **Type**: process
- **Nodes**: 4
- **Edges**: 4
- **Layout**: not specified

---

## Federal Views

### Federal Intra Subviews

**File**: federal-intra.json
**Total subviews**: 10

#### 1. Department of Defense Internal Structure (`dod_internal`)
- **Type**: intra
- **Anchor**: `federal:dod`
- **Nodes**: 6
- **Edges**: 5
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 2. State Department Internal Structure (`state_dept_internal`)
- **Type**: intra
- **Anchor**: `federal:state`
- **Nodes**: 5
- **Edges**: 4
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 3. Treasury Department Internal Structure (`treasury_internal`)
- **Type**: intra
- **Anchor**: `federal:treasury`
- **Nodes**: 5
- **Edges**: 4
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 4. Department of Justice Internal Structure (`doj_internal`)
- **Type**: intra
- **Anchor**: `federal:doj`
- **Nodes**: 5
- **Edges**: 4
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 5. HHS Internal Structure (`hhs_internal`)
- **Type**: intra
- **Anchor**: `federal:hhs`
- **Nodes**: 5
- **Edges**: 4
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 6. Education Department Internal Structure (`education_internal`)
- **Type**: intra
- **Anchor**: `federal:education`
- **Nodes**: 5
- **Edges**: 4
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 7. Transportation Department Internal Structure (`dot_internal`)
- **Type**: intra
- **Anchor**: `federal:dot`
- **Nodes**: 5
- **Edges**: 4
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 8. Homeland Security Department Internal Structure (`dhs_internal`)
- **Type**: intra
- **Anchor**: `federal:dhs`
- **Nodes**: 6
- **Edges**: 5
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 9. EPA Internal Structure (`epa_internal`)
- **Type**: intra
- **Anchor**: `federal:epa`
- **Nodes**: 5
- **Edges**: 4
- **Layout**: elk-mrtree
  - Direction: DOWN
  - Spacing: 70

#### 10. Federal Executive Agencies (`federal:federal_agencies`)
- **Type**: intra
- **Anchor**: `federal:federal_agencies`
- **Nodes**: 30
- **Edges**: 53
- **Layout**: elk-mrtree

### Federal Process Views

**File**: federal-processes.json
**Total processes**: 4

#### 1. Federal Budget & Appropriations (`federal_budget`)
- **Type**: process
- **Nodes**: 5
- **Edges**: 5
- **Layout**: not specified

#### 2. Federal Regulatory Rulemaking (APA) (`federal_rulemaking`)
- **Type**: process
- **Nodes**: 4
- **Edges**: 4
- **Layout**: not specified

#### 3. Federal Impeachment Process (`impeachment`)
- **Type**: process
- **Nodes**: 4
- **Edges**: 4
- **Layout**: not specified

#### 4. Federal Grant Application (`federal_grant`)
- **Type**: process
- **Nodes**: 4
- **Edges**: 5
- **Layout**: not specified

---

## Summary

- **Main view**: 1 (implicit in main.json)
- **City subviews**: 12 intra views
- **City processes**: 7 process flows
- **State subviews**: 13 intra views
- **State processes**: 6 process flows
- **Federal subviews**: 10 intra views
- **Federal processes**: 4 process flows
- **Total intra views**: 35
- **Total process views**: 17
- **Grand total views**: 53
