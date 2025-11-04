# Internal Structure Analysis Summary - November 4, 2025

## Overview

Analysis complete. Full details: [internal-structure-analysis.md](internal-structure-analysis.md)

This analysis shows the INTERNAL organizational hierarchies of nodes, revealing what should be in intra vs intra-detailed.

## Key Findings

### City

**Largest structures**:
1. **city:mayor_nyc** (main) → 45 direct children, 88 total descendants
   - Includes **city:departments** → 43 children (all city departments)

2. **city:departments** (appears twice in hierarchy - likely showing categorization)
   - Contains: NYPD, FDNY, DOE, DOHMH, DHS, HPD, HRA, DOT, DSNY, OMB (all with internal divisions)

**Departments with internal structure** (shown in brackets):
- **NYPD**: 7 bureaus (Patrol, Detective, Transit, Housing, Counterterrorism, Intelligence, Internal Affairs)
- **DOE**: 6 divisions (Instructional Tech, School Quality, Early Childhood, Multilingual, Special Ed, Facilities)
- **FDNY**: 4 bureaus (Operations, EMS, Prevention, Training)
- **DOHMH**: 4 bureaus (Communicable Disease, Vital Statistics, Mental Health, Environmental Health)
- **DHS**: 4 divisions (Adult Family, Family Services, Prevention, Outreach)
- **HPD**: 4 divisions (Preservation, Development, Code Enforcement, Neighborhood Preservation)
- **HRA**: 4 offices (Adult Services, Family Independence, HIV/AIDS, Medical Assistance)
- **DOT**: 4 divisions (Traffic Operations, Infrastructure, Bridges, Ferries)
- **DSNY**: 3 bureaus (Cleaning & Collection, Recycling, Motor Equipment)
- **OMB**: 4 units (Budget Division, Economic & Revenue, Operations, Management Analysis)

**Total**:
- 22 nodes with internal structure (12 main, 10 intra)
- Departments have ~43 children total
- Several departments have 2nd-level internal divisions (bureaus/offices)

### State

**Largest structures**:
1. **state:ny_state_constitution** (main) → 7 direct children, 235 total descendants
   - Includes all state agencies and court system

2. **state:state_agencies** (main) → 43 children (all state departments)

**Complex hierarchies** (flagged for intra-detailed):
- **Court of Appeals** → 11 total descendants (court hierarchy)
- **Appellate Divisions** → 10 total descendants (includes Appellate Terms, County Courts with their subdivisions)
- **Division of Homeland Security** → 4 total descendants

**Total**:
- 24 nodes with internal structure (9 main, 15 intra)

### Federal

**Largest structures**:
1. **federal:us_constitution** (main) → 10 direct children, 214 total descendants
   - Includes all federal agencies

2. **federal:federal_agencies** (main) → 31 children (all federal departments)

**Departments with internal structure**:
- **DHS**: 6 sub-agencies (FEMA, CBP, ICE, USCIS, Secret Service, FEMA duplicate?)
- **DOT**: 4 administrations (FHWA, FTA, FAA, NHTSA)
- **DOE**: 4 offices
- **EPA**: 4 offices

**Total**:
- 16 nodes with internal structure (7 main, 9 intra)

## Data Organization Implications

### What's Currently in Intra Files

**All good**:
- ✅ Department/agency nodes (NYPD, DOE, FDNY, etc.)
- ✅ They have children defined in subviews

### What Should Be in Intra-Detailed

Based on the 3-level hierarchy pattern, these nodes should be in **{jurisdiction}-intra-detailed**:

**City** (3rd level - bureaus/divisions within departments):
- NYPD bureaus: Patrol, Detective, Transit, Housing, Counterterrorism, Intelligence, Internal Affairs
- DOE divisions: Instructional Tech, School Quality, Early Childhood, Multilingual, Special Ed, Facilities
- FDNY bureaus: Operations, EMS, Prevention, Training
- DOHMH bureaus: 4 bureaus
- DHS divisions: 4 divisions
- HPD divisions: 4 divisions
- HRA offices: 4 offices
- DOT divisions: 4 divisions
- DSNY bureaus: 3 bureaus
- OMB units: 4 units

**Estimated**: ~45-50 nodes should move from city-intra to city-intra-detailed

**State** (3rd level - court subdivisions, agency divisions):
- Court subdivisions (Appellate Terms, County Courts, City Courts, etc.)
- DHSES divisions
- Other agency subdivisions

**Estimated**: ~25-30 nodes should move from state-intra to state-intra-detailed

**Federal** (3rd level - sub-agencies, offices):
- DHS sub-agencies: FEMA, CBP, ICE, USCIS, Secret Service
- DOT administrations: FHWA, FTA, FAA, NHTSA
- DOE offices: 4 offices
- EPA offices: 4 offices

**Estimated**: ~20-25 nodes should move from federal-intra to federal-intra-detailed

## Recommendations

### 1. Create Intra-Detailed Structure

The analysis shows clear 3-level hierarchies exist:
- **Level 1 (main)**: Constitutional structures (Mayor, Governor, President)
- **Level 2 (intra)**: Implementation (NYPD, DOE, DEC)
- **Level 3 (intra-detailed)**: Internal divisions (NYPD bureaus, DOE divisions)

**Action**: Create {jurisdiction}-intra-detailed/ directories and move 3rd-level nodes there.

### 2. Nodes to Address

**Mayor's Office**: Currently city:mayor_nyc → city:departments (45 children)
- Consider if mayor's office itself should have internal structure (Chief of Staff, Deputy Mayors, etc.)

**Comptroller**: Currently has 1 child (city:nyc_budget)
- May need internal divisions (Audit Bureau, Budget Bureau, etc.)

**City Council**: Currently has 2 children
- May need: Speaker, Committees (if desired level of detail)

**Question**: Do you want to generate internal structures for these offices, or keep them simple?

### 3. Data Quality

✅ **No issues found**:
- All nodes referenced in hierarchies exist
- No orphaned nodes
- Clear organizational structures

## Next Steps

1. **WAITING FOR REVIEW**: Decide on intra-detailed organization
   - Move 3rd level nodes to intra-detailed?
   - Generate internal structures for Mayor's Office, Comptroller, City Council?

2. **After decisions**: Create parse script to generate final 10 files:
   - 1 × main.json (current state)
   - 3 × {jurisdiction}-intra.json (possibly with nodes moved out)
   - 3 × {jurisdiction}-intra-detailed/ (new, with 3rd level nodes)
   - 3 × {jurisdiction}-processes.json (current state, already fixed)

## Files Generated

1. [internal-structure-analysis.md](internal-structure-analysis.md) - Full hierarchical breakdown
2. This summary document
