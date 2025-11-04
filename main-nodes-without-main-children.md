# Main Nodes Without Main Children

Nodes in main.json that either:

1. Have NO children at all, OR
2. Have children but those children are NOT in main.json

These may need internal office structures (Chief of Staff, Deputy Mayors, etc.)

---

## City

### Body Nodes

- **Manhattan Community Boards (12)** (`city:cb_manhattan`)
  - No children at all
- **Brooklyn Community Boards (18)** (`city:cb_brooklyn`)
  - No children at all
- **Bronx Community Boards (12)** (`city:cb_bronx`)
  - No children at all
- **Queens Community Boards (14)** (`city:cb_queens`)
  - No children at all
- **Staten Island Community Boards (3)** (`city:cb_staten_island`)
  - No children at all

### Law Nodes

- **Administrative Code** (`city:administrative_code`)
  - No children at all
- **Rules of the City of New York** (`city:rules_of_city`)
  - No children at all

### Process Nodes

- **NYC Budget** (`city:nyc_budget`)
  - No children at all

**Total**: 8 nodes without main children

---

## State

### Body Nodes

- **State Judicial System** (`state:state_judiciary`)
  - No children at all

### Law Nodes

- **NY Consolidated Laws** (`state:ny_consolidated_laws`)
  - No children at all
- **NY Codes, Rules & Regulations (NYCRR)** (`state:nycrr`)
  - No children at all

### Process Nodes

- **State Budget** (`state:state_budget`)
  - No children at all

### Authority Nodes

- **Metropolitan Transportation Authority (MTA)** (`state:mta`)
  - No children at all
- **New York State Thruway Authority** (`state:nys_thruway`)
  - No children at all
- **New York Power Authority (NYPA)** (`state:nypa`)
  - No children at all
- **Dormitory Authority (DASNY)** (`state:dasny`)
  - No children at all
- **Empire State Development (ESD)** (`state:esd`)
  - No children at all
- **Battery Park City Authority (BPCA)** (`state:battery_park_city_authority`)
  - No children at all
- **Roosevelt Island Operating Corporation (RIOC)** (`state:roosevelt_island`)
  - No children at all
- **Metropolitan Transportation Authority (MTA)** (`state:mta`)
  - No children at all
- **New York State Thruway Authority** (`state:nys_thruway`)
  - No children at all
- **New York Power Authority (NYPA)** (`state:nypa`)
  - No children at all
- **Dormitory Authority (DASNY)** (`state:dasny`)
  - No children at all
- **Empire State Development (ESD)** (`state:esd`)
  - No children at all
- **Battery Park City Authority (BPCA)** (`state:battery_park_city_authority`)
  - No children at all
- **Roosevelt Island Operating Corporation (RIOC)** (`state:roosevelt_island`)
  - No children at all

### Bi_state_authority Nodes

- **Port Authority of New York and New Jersey** (`state:port_authority`)
  - No children at all
- **Port Authority of New York and New Jersey** (`state:port_authority`)
  - No children at all

### City_authority Nodes

- **New York City Housing Authority (NYCHA)** (`state:nycha`)
  - No children at all
- **New York City Housing Authority (NYCHA)** (`state:nycha`)
  - No children at all

**Total**: 22 nodes without main children

---

## Federal

### Body Nodes

- **Federal Court System** (`federal:federal_courts`)
  - No children at all

### Law Nodes

- **United States Code** (`federal:us_code`)
  - No children at all
- **Code of Federal Regulations (CFR)** (`federal:cfr`)
  - No children at all

### Process Nodes

- **Federal Budget** (`federal:federal_budget`)
  - No children at all

**Total**: 4 nodes without main children

---

## Candidates for Internal Office Structure

These executive/legislative offices may need internal structures:

### City

- **Mayor** (`city:mayor_nyc`)
  - Main children: 2
  - Total children (including intra): 2
  - ✅ Has main-level children: NYC Departments & Agencies, NYC Budget
- **Comptroller** (`city:comptroller`)
  - Main children: 1
  - Total children (including intra): 1
  - ✅ Has main-level children: NYC Budget
- **Public Advocate** (`city:public_advocate`)
  - Main children: 1
  - Total children (including intra): 1
  - ✅ Has main-level children: City Council
- **City Council** (`city:city_council`)
  - Main children: 2
  - Total children (including intra): 2
  - ✅ Has main-level children: Administrative Code, NYC Budget

### State

- **Governor of New York** (`state:governor_ny`)
  - Main children: 2
  - Total children (including intra): 2
  - ✅ Has main-level children: State Budget, State Agencies
- **NY State Legislature** (`state:state_legislature`)
  - Main children: 4
  - Total children (including intra): 4
  - ✅ Has main-level children: State Budget, NY State Assembly, NY State Senate, Public Authorities
- **State Comptroller** (`state:state_comptroller`)
  - Main children: 1
  - Total children (including intra): 1
  - ✅ Has main-level children: State Budget
- **NY State Assembly** (`state:state_assembly`)
  - Main children: 1
  - Total children (including intra): 1
  - ✅ Has main-level children: NY Consolidated Laws
- **NY State Senate** (`state:state_senate`)
  - Main children: 1
  - Total children (including intra): 1
  - ✅ Has main-level children: NY Consolidated Laws

### Federal

- **President of the United States** (`federal:president`)
  - Main children: 2
  - Total children (including intra): 2
  - ✅ Has main-level children: Federal Agencies, Federal Budget
- **U.S. Congress** (`federal:congress`)
  - Main children: 3
  - Total children (including intra): 3
  - ✅ Has main-level children: U.S. Senate, U.S. House of Representatives, Federal Budget
- **U.S. Senate** (`federal:senate`)
  - Main children: 1
  - Total children (including intra): 1
  - ✅ Has main-level children: United States Code
- **U.S. House of Representatives** (`federal:house_of_representatives`)
  - Main children: 1
  - Total children (including intra): 1
  - ✅ Has main-level children: United States Code

