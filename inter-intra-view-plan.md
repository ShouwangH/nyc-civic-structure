# Inter/Intra View Plan

**Main view**: Constitutional/charter structure (hierarchical) - already defined in main.json
**Inter view**: Entity's relationships to OTHER entities (non-hierarchical interactions)
**Intra view**: Entity's INTERNAL organizational structure
- Concentric layout: Equivalent divisions/departments at same level
- Hierarchical layout: Personnel chains of command

---

## City

### NYC Charter (`city:nyc_charter`)
- **Type**: law
- **Inter view**: None needed (foundational document, doesn't interact)
- **Intra view**: None needed (no internal structure)

### Mayor (`city:mayor_nyc`)
- **Type**: office
- **Inter view**:
  - Proposes → NYC Budget
  - Appoints commissioners → NYC Departments & Agencies
  - Relationships to Comptroller, Council (oversight interactions)
- **Intra view**: **Hierarchical** (personnel-based)
  - Mayor
  - Chief of Staff
  - First Deputy Mayor
  - Deputy Mayors (5-6 deputies for different policy areas)
  - Press Secretary
  - Counsel to the Mayor
  - Office of Operations
  - *Note: This needs to be generated - not in current data*

### Comptroller (`city:comptroller`)
- **Type**: office
- **Inter view**:
  - Audits → NYC Budget
  - Reviews → Department spending
  - Pension oversight relationships
- **Intra view**: **Concentric** (parallel bureaus)
  - Bureau of Audit
  - Bureau of Asset Management
  - Bureau of Accountancy
  - Bureau of Public Finance
  - *Currently exists in city-intra.json*

### Public Advocate (`city:public_advocate`)
- **Type**: office
- **Inter view**:
  - Non-voting member → City Council
  - Ombudsman relationships to agencies
- **Intra view**: None needed (small office, no major internal structure)

### City Council (`city:city_council`)
- **Type**: body
- **Inter view**:
  - Enacts → Administrative Code
  - Approves → NYC Budget
  - Oversight → Agencies (via hearings)
- **Intra view**: **Hierarchical** (leadership-based)
  - Speaker
  - Majority Leader
  - Committee Chairs (major committees)
  - 51 Council Members
  - *Note: This needs to be generated - not in current data*

### NYC Departments & Agencies (`city:departments`)
- **Type**: agency (category node)
- **Inter view**:
  - Appointed by → Mayor
  - Overseen by → Mayor
  - Promulgates → Rules of the City
- **Intra view**: **Concentric** (parallel departments)
  - NYPD, FDNY, DOE, DOHMH, DHS, HPD, HRA, DOT, DSNY, OMB, etc. (43 departments)
  - *Currently exists in city-intra.json*

  **Child nodes with their own views**:

  #### NYPD (`city:NYPD`)
  - **Inter view**:
    - Reports to → Mayor
    - Coordinates with → DA offices, state courts
  - **Intra view**: **Concentric** (parallel bureaus)
    - 7 bureaus: Patrol, Detective, Transit, Housing, Counterterrorism, Intelligence, Internal Affairs
    - *Currently exists in city-intra.json subview*

  #### FDNY (`city:FDNY`)
  - **Inter view**:
    - Reports to → Mayor
    - Coordinates with → NYPD, hospitals
  - **Intra view**: **Concentric** (parallel bureaus)
    - 4 bureaus: Operations, EMS, Prevention, Training
    - *Currently exists in city-intra.json subview*

  #### DOE (`city:DOE`)
  - **Inter view**:
    - Reports to → Mayor
    - Overseen by → State Education Department
  - **Intra view**: **Concentric** (parallel divisions)
    - 6 divisions: Instructional Tech, School Quality, Early Childhood, Multilingual, Special Ed, Facilities
    - *Currently exists in city-intra.json subview*

  #### DOHMH, DHS, HPD, HRA, DOT, DSNY, OMB
  - Similar pattern: Inter shows reporting/coordination, Intra shows internal divisions
  - *All currently have intra structures in city-intra.json*

### Administrative Code (`city:administrative_code`)
- **Type**: law
- **Inter view**:
  - Enacted by → City Council
  - Implemented by → Agencies
- **Intra view**: None needed (could have title/chapter structure but not priority)

### Rules of the City of New York (`city:rules_of_city`)
- **Type**: law
- **Inter view**:
  - Promulgated by → Agencies
  - Based on → Administrative Code
- **Intra view**: None needed

### NYC Budget (`city:nyc_budget`)
- **Type**: process
- **Inter view**:
  - Proposed by → Mayor
  - Approved by → Council
  - Audited by → Comptroller
- **Intra view**: Could show budget process flow (currently in city-processes.json)

### Borough Advisory Structure (`city:borough_structure`)
- **Type**: category
- **Inter view**: None needed (advisory only)
- **Intra view**: **Concentric** (5 equal borough presidents)
  - Already shown in main view

### Borough Presidents (5) (`city:bp_*`)
- **Type**: office
- **Inter view**:
  - Advisory to → Mayor, Council
  - Land use recommendations
- **Intra view**: Each has relationship to their Community Boards (already in main)

### Community Boards (59 total) (`city:cb_*`)
- **Type**: body
- **Inter view**:
  - Appointed by → Borough President
  - Advisory to → Council, City Planning
- **Intra view**: Could show individual boards, but not priority

---

## State

### NY State Constitution (`state:ny_state_constitution`)
- **Type**: law
- **Inter view**: None needed (foundational document)
- **Intra view**: None needed

### Governor of New York (`state:governor_ny`)
- **Type**: office
- **Inter view**:
  - Proposes → State Budget
  - Appoints → Agency commissioners
  - Signs/vetoes → Legislation
  - Appoints (with Senate confirmation) → Judges
- **Intra view**: **Hierarchical** (personnel-based)
  - Governor
  - Lieutenant Governor
  - Secretary to the Governor
  - Chief of Staff
  - Deputy Secretaries (policy areas)
  - Counsel's Office
  - Communications Office
  - *Note: This needs to be generated - not in current data*

### NY State Legislature (`state:state_legislature`)
- **Type**: body
- **Inter view**:
  - Enacts → Consolidated Laws
  - Adopts → State Budget
  - Creates → Public Authorities
  - Confirms → Gubernatorial appointments
- **Intra view**: **Hierarchical** (bicameral structure)
  - Already shows Assembly + Senate in main view

  **Child nodes with their own views**:

  #### NY State Assembly (`state:state_assembly`)
  - **Inter view**:
    - Enacts → Laws (with Senate)
    - Part of → Budget adoption
  - **Intra view**: **Hierarchical** (leadership-based)
    - Speaker
    - Majority Leader
    - Committee Chairs
    - 150 Assembly Members
    - *Note: This needs to be generated*

  #### NY State Senate (`state:state_senate`)
  - **Inter view**:
    - Enacts → Laws (with Assembly)
    - Confirms → Appointments
  - **Intra view**: **Hierarchical** (leadership-based)
    - Majority Leader/President Pro Tem
    - Committee Chairs
    - 63 Senators
    - *Note: This needs to be generated*

### State Judicial System (`state:state_judiciary`)
- **Type**: body
- **Inter view**:
  - Judges appointed by → Governor (Court of Appeals)
  - Judges elected → By voters (other courts)
  - Administrative oversight by → Chief Judge
- **Intra view**: **Hierarchical** (court hierarchy)
  - Court of Appeals → Appellate Divisions → Trial Courts → Local Courts
  - *Currently exists in state-intra.json subview*

  **Child nodes with their own views**:

  #### Court of Appeals (`state:court_of_appeals`)
  - **Inter view**:
    - Reviews appeals from → Appellate Divisions
    - Final interpreter of → State Constitution
  - **Intra view**: Could show 7 judges + Chief Judge, but not priority

  #### Appellate Divisions (`state:appellate_divisions`)
  - **Inter view**:
    - Reviews appeals from → Trial courts
    - Appeals to → Court of Appeals
  - **Intra view**: **Concentric** (4 departments)
    - First Department (Manhattan, Bronx)
    - Second Department (Brooklyn, Queens, SI, Long Island)
    - Third Department (Albany, upstate)
    - Fourth Department (Rochester, Buffalo)
    - *Note: Could be added to show the 4 departments*

### State Comptroller (`state:state_comptroller`)
- **Type**: office
- **Inter view**:
  - Audits → State Budget
  - Audits → State agencies
  - Audits → Local governments
  - Manages → Pension fund
- **Intra view**: **Concentric** (parallel offices)
  - Office of Operations and State Audit
  - Office of Local Government and School Accountability
  - Office of Retirement Services
  - Office of Investment Management
  - *Currently exists in state-intra.json subview*

### State Budget (`state:state_budget`)
- **Type**: process
- **Inter view**:
  - Proposed by → Governor
  - Adopted by → Legislature
  - Audited by → Comptroller
- **Intra view**: Could show budget process flow (currently in state-processes.json)

### NY Consolidated Laws (`state:ny_consolidated_laws`)
- **Type**: law
- **Inter view**:
  - Enacted by → Assembly + Senate
  - Signed by → Governor
- **Intra view**: None needed

### NY Codes, Rules & Regulations (NYCRR) (`state:nycrr`)
- **Type**: law
- **Inter view**:
  - Issued by → State Agencies
- **Intra view**: None needed

### State Agencies (`state:state_agencies`)
- **Type**: agency (category node)
- **Inter view**:
  - Overseen by → Governor
  - Commissioners appointed by → Governor
  - Issue → NYCRR regulations
- **Intra view**: **Concentric** (parallel departments)
  - DOT, DOH, Education, DEC, Labor, etc. (27 agencies)
  - *Currently exists in state-intra.json subview*

  **Child nodes with their own views**:

  #### Department of Transportation (`state:dot_ny`)
  - **Inter view**:
    - Reports to → Governor
    - Coordinates with → Local governments
  - **Intra view**: **Concentric** (parallel offices)
    - 4 offices: Design, Operations, Traffic Safety, Construction
    - *Currently exists in state-intra.json subview*

  #### Department of Environmental Conservation (`state:dec_ny`)
  - **Inter view**:
    - Reports to → Governor
    - Enforces → Environmental laws
  - **Intra view**: **Concentric** (parallel divisions)
    - 5 divisions: Air Resources, Water, Lands & Forests, Fish & Wildlife, Environmental Remediation
    - *Currently exists in state-intra.json subview*

  #### Similar patterns for other agencies with internal structures

### Public Authorities (`state:public_authorities`)
- **Type**: category
- **Inter view**:
  - Created by → State Legislature
  - Governance varies by authority
- **Intra view**: **Concentric** (parallel authorities)
  - MTA, Thruway, NYPA, DASNY, ESD, BPCA, RIOC, Port Authority, NYCHA
  - Already shown in main view

### Individual Authorities (MTA, Port Authority, etc.)
- **Type**: authority
- **Inter view**:
  - Created by → Legislature
  - Board appointed by → Governor (varies)
  - Issues → Bonds
- **Intra view**: Most could have internal structures (MTA subsidiaries, etc.) but not in current scope

---

## Federal

### U.S. Constitution (`federal:us_constitution`)
- **Type**: law
- **Inter view**: None needed (foundational document)
- **Intra view**: None needed

### President of the United States (`federal:president`)
- **Type**: office
- **Inter view**:
  - Proposes → Federal Budget
  - Appoints (with Senate confirmation) → Cabinet, judges
  - Commander-in-Chief → Military
  - Signs/vetoes → Legislation
  - Oversees → Federal Agencies
- **Intra view**: **Hierarchical** (personnel-based)
  - President
  - Vice President
  - Chief of Staff
  - Senior Advisors
  - National Security Advisor
  - Press Secretary
  - White House Counsel
  - Office of Management and Budget (Executive Office)
  - *Note: This needs to be generated - not in current data*

### U.S. Congress (`federal:congress`)
- **Type**: body
- **Inter view**:
  - Enacts → United States Code
  - Enacts → Federal Budget
  - Confirms → Presidential appointments (Senate)
  - Impeachment power
- **Intra view**: **Hierarchical** (bicameral structure)
  - Already shows Senate + House in main view

  **Child nodes with their own views**:

  #### U.S. Senate (`federal:senate`)
  - **Inter view**:
    - Enacts → Laws (with House)
    - Confirms → Appointments
    - Ratifies → Treaties
  - **Intra view**: **Hierarchical** (leadership-based)
    - Vice President (President of Senate)
    - President Pro Tempore
    - Majority/Minority Leaders
    - Committee Chairs
    - 100 Senators
    - *Note: This needs to be generated*

  #### U.S. House of Representatives (`federal:house_of_representatives`)
  - **Inter view**:
    - Enacts → Laws (with Senate)
    - Originates → Revenue bills
    - Impeachment power
  - **Intra view**: **Hierarchical** (leadership-based)
    - Speaker of the House
    - Majority/Minority Leaders
    - Committee Chairs
    - 435 Representatives
    - *Note: This needs to be generated*

### Supreme Court of the United States (`federal:supreme_court`)
- **Type**: body
- **Inter view**:
  - Justices appointed by → President
  - Justices confirmed by → Senate
  - Reviews → Federal and state court decisions
- **Intra view**: Could show Chief Justice + 8 Associate Justices, but not priority

### Federal Court System (`federal:federal_courts`)
- **Type**: body
- **Inter view**:
  - Overseen by → Supreme Court
  - Judges appointed by → President, confirmed by Senate
- **Intra view**: **Hierarchical** (court hierarchy)
  - Circuit Courts of Appeals (13 circuits)
  - District Courts (94 districts)
  - Specialized courts
  - *Note: This could be added*

### Federal Budget (`federal:federal_budget`)
- **Type**: process
- **Inter view**:
  - Proposed by → President
  - Enacted by → Congress
- **Intra view**: Could show budget process flow (currently in federal-processes.json)

### Federal Agencies (`federal:federal_agencies`)
- **Type**: agency (category node)
- **Inter view**:
  - Overseen by → President
  - Secretaries appointed by → President, confirmed by Senate
  - Promulgate → CFR regulations
- **Intra view**: **Concentric** (parallel departments)
  - 15 Cabinet departments + major independent agencies
  - *Currently exists in federal-intra.json subview*

  **Child nodes with their own views**:

  #### Department of Homeland Security (`federal:dhs`)
  - **Inter view**:
    - Reports to → President
    - Coordinates with → State/local law enforcement
  - **Intra view**: **Concentric** (parallel agencies)
    - 6 agencies: FEMA, CBP, ICE, USCIS, Secret Service, TSA
    - *Currently exists in federal-intra.json subview*

  #### Department of Transportation (`federal:dot`)
  - **Inter view**:
    - Reports to → President
    - Regulates → Transportation industry
  - **Intra view**: **Concentric** (parallel administrations)
    - 4 administrations: FHWA, FTA, FAA, NHTSA
    - *Currently exists in federal-intra.json subview*

  #### Similar patterns for other departments with internal structures

### United States Code (`federal:us_code`)
- **Type**: law
- **Inter view**:
  - Enacted by → Senate + House
  - Signed by → President
- **Intra view**: None needed

### Code of Federal Regulations (CFR) (`federal:cfr`)
- **Type**: law
- **Inter view**:
  - Promulgated by → Federal Agencies
  - Based on → United States Code
- **Intra view**: None needed

---

## Summary: What Needs to Be Generated

### City
1. **Mayor's Office** - Hierarchical intra view (Chief of Staff, Deputy Mayors)
2. **City Council** - Hierarchical intra view (Speaker, committees)

### State
1. **Governor's Office** - Hierarchical intra view (Secretary, Chief of Staff, Deputies)
2. **State Assembly** - Hierarchical intra view (Speaker, leadership)
3. **State Senate** - Hierarchical intra view (Majority Leader, leadership)
4. **Appellate Divisions** - Concentric view (4 departments) - optional

### Federal
1. **President's Office (White House)** - Hierarchical intra view (Chief of Staff, senior staff)
2. **U.S. Senate** - Hierarchical intra view (leadership structure)
3. **U.S. House** - Hierarchical intra view (Speaker, leadership)
4. **Federal Court System** - Hierarchical view (circuit/district courts) - optional

### What Already Exists
- All agency/department internal structures (bureaus, divisions, offices)
- Court hierarchy for NY State
- Most inter relationships already in main.json edges

---

## Implementation Notes

1. **Inter views** should reference edges that already exist in main.json or need to be added
2. **Intra views** for existing agencies/departments already exist in {jurisdiction}-intra.json subviews
3. **New intra views** needed for executive/legislative offices (personnel-based hierarchies)
4. **Layout specification** needs to be added to each subview definition:
   - `"layout": { "type": "hierarchical" }` for personnel chains
   - `"layout": { "type": "concentric" }` for parallel divisions

---

## Implementation Status (Updated 2025-11-04)

### ✅ Completed

1. **Personnel Hierarchy Generation** (All 8 views)
   - ✅ NYC Mayor's Office - 11 nodes, hierarchical structure
   - ✅ NYC City Council - 9 nodes, committee structure
   - ✅ NY Governor's Office - 11 nodes, hierarchical structure
   - ✅ NY State Assembly - 8 nodes, committee structure
   - ✅ NY State Senate - 8 nodes, committee structure
   - ✅ White House - 12 nodes, hierarchical structure
   - ✅ U.S. Senate - 8 nodes, committee structure
   - ✅ U.S. House - 9 nodes, committee structure

2. **Data Migration**
   - ✅ Subviews reorganized by anchor node location
   - ✅ main.json now contains 17 subviews (anchored to main nodes)
   - ✅ Intra files contain subviews anchored to intra nodes
   - ✅ All personnel hierarchy nodes integrated into intra files
   - ✅ All generated edges integrated into subview configs

3. **Layout Optimization**
   - ✅ Changed departments/agencies/judiciary to concentric layout (better for peer relationships)
   - ✅ Changed legislative committees to concentric layout (equal-level committees)
   - ✅ Kept White House as hierarchical (true hierarchy)
   - ✅ Kept mayor/governor offices as hierarchical (chain of command)

4. **Inter Views - Deferred**
   - ✅ Removed `state:comptroller_oversight` (was the only inter view with conflict)
   - ⚠️ Decided to defer all inter views until multi-view UI is implemented
   - 📝 Documented in [multi-subview-analysis.md](multi-subview-analysis.md)

5. **UX Refinements**
   - ✅ All subviews hidden from left menu (cleaner interface)
   - ✅ Subviews still activate when clicking nodes
   - ✅ Filter applied in `visibleSubgraphConfigs` not `buildSubgraphByEntryId`

### 🚧 Next Steps

1. **Multi-View UI** (Future)
   - Build sidebar-based view selector
   - Allow multiple views per node (inter + intra)
   - Show all available views for a selected node
   - Implement view type filtering

2. **Inter Views** (Deferred until multi-view UI)
   - Create inter views for nodes that need both inter + intra
   - Currently planned: mayor, comptroller, council, governor, assembly, senate, judiciary
   - See [view-configuration-plan.md](view-configuration-plan.md) for details

3. **Additional Views** (Low Priority)
   - Appellate Divisions (4 departments) - concentric
   - Federal Court System (circuit/district hierarchy)
   - Individual authority internal structures

### 📊 Current Subview Statistics

**main.json**: 17 subviews
- 2 City comptroller/departments
- 6 City personnel hierarchies (mayor, council) + inter views
- 3 State category views (agencies, judiciary)
- 3 State personnel hierarchies (governor, assembly, senate)
- 1 State inter view (public authorities)
- 2 Federal personnel hierarchies (white house, senate, house)
- Hidden from menu, accessible via click

**city-intra.json**: 10 subviews (agency internal structures)
**state-intra.json**: 10 subviews (agency internal structures)
**federal-intra.json**: 9 subviews (agency internal structures)

### 🎯 Architecture Decision

**Current**: Single view per node (later view overwrites earlier in Map)
**Future**: Multi-view support via sidebar selector

For now, nodes activate their single available view when clicked. Multi-view nodes (those with both inter + intra) will be supported once sidebar UI is implemented.
