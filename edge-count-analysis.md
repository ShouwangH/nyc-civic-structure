# Edge Count Analysis Report

**Methodology**: For each main.json node, traverse the graph and count nodes at each distance:

- **Distance 1** (intra): Nodes 1 edge away → Should be in {jurisdiction}-intra.json
- **Distance 2** (detailed): Nodes 2 edges away → Should be in {jurisdiction}-intra-detailed/
- **Distance 3+** (further): Nodes 3+ edges away → Should also be in intra-detailed/

---

## City

### NYC Charter (`city:nyc_charter`)
- **Distance 1** (intra): 4 nodes
  - In main: 4, In intra: 0, Missing: 0
- **Distance 2** (detailed): 3 nodes
  - In main: 3, In intra: 0, Missing: 0
- **Distance 3+** (further): 1 nodes
  - In main: 1, In intra: 0, Missing: 0

### Mayor (`city:mayor_nyc`)
- **Distance 1** (intra): 2 nodes
  - In main: 2, In intra: 0, Missing: 0
- **Distance 2** (detailed): 1 nodes
  - In main: 1, In intra: 0, Missing: 0
- **Distance 3+** (further): 0 nodes

### Comptroller (`city:comptroller`)
- **Distance 1** (intra): 1 nodes
  - In main: 1, In intra: 0, Missing: 0
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Public Advocate (`city:public_advocate`)
- **Distance 1** (intra): 1 nodes
  - In main: 1, In intra: 0, Missing: 0
- **Distance 2** (detailed): 2 nodes
  - In main: 2, In intra: 0, Missing: 0
- **Distance 3+** (further): 0 nodes

### City Council (`city:city_council`)
- **Distance 1** (intra): 2 nodes
  - In main: 2, In intra: 0, Missing: 0
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### NYC Departments & Agencies (`city:departments`)
- **Distance 1** (intra): 1 nodes
  - In main: 1, In intra: 0, Missing: 0
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Administrative Code (`city:administrative_code`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Rules of the City of New York (`city:rules_of_city`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### NYC Budget (`city:nyc_budget`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Borough Advisory Structure (`city:borough_structure`)
- **Distance 1** (intra): 5 nodes
  - In main: 5, In intra: 0, Missing: 0
- **Distance 2** (detailed): 5 nodes
  - In main: 5, In intra: 0, Missing: 0
- **Distance 3+** (further): 0 nodes

### Manhattan Borough President (`city:bp_manhattan`)
- **Distance 1** (intra): 1 nodes
  - In main: 1, In intra: 0, Missing: 0
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Brooklyn Borough President (`city:bp_brooklyn`)
- **Distance 1** (intra): 1 nodes
  - In main: 1, In intra: 0, Missing: 0
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Bronx Borough President (`city:bp_bronx`)
- **Distance 1** (intra): 1 nodes
  - In main: 1, In intra: 0, Missing: 0
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Queens Borough President (`city:bp_queens`)
- **Distance 1** (intra): 1 nodes
  - In main: 1, In intra: 0, Missing: 0
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Staten Island Borough President (`city:bp_staten_island`)
- **Distance 1** (intra): 1 nodes
  - In main: 1, In intra: 0, Missing: 0
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Manhattan Community Boards (12) (`city:cb_manhattan`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Brooklyn Community Boards (18) (`city:cb_brooklyn`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Bronx Community Boards (12) (`city:cb_bronx`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Queens Community Boards (14) (`city:cb_queens`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Staten Island Community Boards (3) (`city:cb_staten_island`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

**CITY TOTALS**:
- Main nodes analyzed: 20
- Total distance 1 (intra): 21
- Total distance 2 (detailed): 11
- Total distance 3+ (further): 1

---

## State

### NY State Constitution (`state:ny_state_constitution`)
- **Distance 1** (intra): 4 nodes
  - In main: 4, In intra: 0, Missing: 0
- **Distance 2** (detailed): 5 nodes
  - In main: 5, In intra: 0, Missing: 0
- **Distance 3+** (further): 11 nodes
  - In main: 11, In intra: 0, Missing: 0

### Governor of New York (`state:governor_ny`)
- **Distance 1** (intra): 2 nodes
  - In main: 2, In intra: 0, Missing: 0
- **Distance 2** (detailed): 1 nodes
  - In main: 1, In intra: 0, Missing: 0
- **Distance 3+** (further): 0 nodes

### NY State Legislature (`state:state_legislature`)
- **Distance 1** (intra): 4 nodes
  - In main: 4, In intra: 0, Missing: 0
- **Distance 2** (detailed): 10 nodes
  - In main: 10, In intra: 0, Missing: 0
- **Distance 3+** (further): 0 nodes

### State Judicial System (`state:state_judiciary`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### State Comptroller (`state:state_comptroller`)
- **Distance 1** (intra): 1 nodes
  - In main: 1, In intra: 0, Missing: 0
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### State Budget (`state:state_budget`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### NY State Assembly (`state:state_assembly`)
- **Distance 1** (intra): 1 nodes
  - In main: 1, In intra: 0, Missing: 0
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### NY State Senate (`state:state_senate`)
- **Distance 1** (intra): 1 nodes
  - In main: 1, In intra: 0, Missing: 0
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### NY Consolidated Laws (`state:ny_consolidated_laws`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### NY Codes, Rules & Regulations (NYCRR) (`state:nycrr`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### State Agencies (`state:state_agencies`)
- **Distance 1** (intra): 1 nodes
  - In main: 1, In intra: 0, Missing: 0
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Public Authorities (`state:public_authorities`)
- **Distance 1** (intra): 9 nodes
  - In main: 9, In intra: 0, Missing: 0
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Metropolitan Transportation Authority (MTA) (`state:mta`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### New York State Thruway Authority (`state:nys_thruway`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### New York Power Authority (NYPA) (`state:nypa`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Dormitory Authority (DASNY) (`state:dasny`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Empire State Development (ESD) (`state:esd`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Battery Park City Authority (BPCA) (`state:battery_park_city_authority`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Roosevelt Island Operating Corporation (RIOC) (`state:roosevelt_island`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Port Authority of New York and New Jersey (`state:port_authority`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### New York City Housing Authority (NYCHA) (`state:nycha`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Metropolitan Transportation Authority (MTA) (`state:mta`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### New York State Thruway Authority (`state:nys_thruway`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### New York Power Authority (NYPA) (`state:nypa`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Dormitory Authority (DASNY) (`state:dasny`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Empire State Development (ESD) (`state:esd`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Battery Park City Authority (BPCA) (`state:battery_park_city_authority`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Roosevelt Island Operating Corporation (RIOC) (`state:roosevelt_island`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Port Authority of New York and New Jersey (`state:port_authority`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### New York City Housing Authority (NYCHA) (`state:nycha`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

**STATE TOTALS**:
- Main nodes analyzed: 30
- Total distance 1 (intra): 23
- Total distance 2 (detailed): 16
- Total distance 3+ (further): 11

---

## Federal

### U.S. Constitution (`federal:us_constitution`)
- **Distance 1** (intra): 3 nodes
  - In main: 3, In intra: 0, Missing: 0
- **Distance 2** (detailed): 5 nodes
  - In main: 5, In intra: 0, Missing: 0
- **Distance 3+** (further): 2 nodes
  - In main: 2, In intra: 0, Missing: 0

### President of the United States (`federal:president`)
- **Distance 1** (intra): 2 nodes
  - In main: 2, In intra: 0, Missing: 0
- **Distance 2** (detailed): 1 nodes
  - In main: 1, In intra: 0, Missing: 0
- **Distance 3+** (further): 0 nodes

### U.S. Congress (`federal:congress`)
- **Distance 1** (intra): 3 nodes
  - In main: 3, In intra: 0, Missing: 0
- **Distance 2** (detailed): 1 nodes
  - In main: 1, In intra: 0, Missing: 0
- **Distance 3+** (further): 0 nodes

### U.S. Senate (`federal:senate`)
- **Distance 1** (intra): 1 nodes
  - In main: 1, In intra: 0, Missing: 0
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### U.S. House of Representatives (`federal:house_of_representatives`)
- **Distance 1** (intra): 1 nodes
  - In main: 1, In intra: 0, Missing: 0
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Supreme Court of the United States (`federal:supreme_court`)
- **Distance 1** (intra): 1 nodes
  - In main: 1, In intra: 0, Missing: 0
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Federal Court System (`federal:federal_courts`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Federal Budget (`federal:federal_budget`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Federal Agencies (`federal:federal_agencies`)
- **Distance 1** (intra): 1 nodes
  - In main: 1, In intra: 0, Missing: 0
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### United States Code (`federal:us_code`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

### Code of Federal Regulations (CFR) (`federal:cfr`)
- **Distance 1** (intra): 0 nodes
- **Distance 2** (detailed): 0 nodes
- **Distance 3+** (further): 0 nodes

**FEDERAL TOTALS**:
- Main nodes analyzed: 11
- Total distance 1 (intra): 12
- Total distance 2 (detailed): 7
- Total distance 3+ (further): 2

---

## Issues and Recommendations

### NYC Charter (`city:nyc_charter`)
- ⚠️  4 distance-1 nodes are in main.json (should be in intra)

### Mayor (`city:mayor_nyc`)
- ⚠️  2 distance-1 nodes are in main.json (should be in intra)

### Comptroller (`city:comptroller`)
- ⚠️  1 distance-1 nodes are in main.json (should be in intra)

### Public Advocate (`city:public_advocate`)
- ⚠️  1 distance-1 nodes are in main.json (should be in intra)

### City Council (`city:city_council`)
- ⚠️  2 distance-1 nodes are in main.json (should be in intra)

### NYC Departments & Agencies (`city:departments`)
- ⚠️  1 distance-1 nodes are in main.json (should be in intra)

### Borough Advisory Structure (`city:borough_structure`)
- ⚠️  5 distance-1 nodes are in main.json (should be in intra)

### Manhattan Borough President (`city:bp_manhattan`)
- ⚠️  1 distance-1 nodes are in main.json (should be in intra)

### Brooklyn Borough President (`city:bp_brooklyn`)
- ⚠️  1 distance-1 nodes are in main.json (should be in intra)

### Bronx Borough President (`city:bp_bronx`)
- ⚠️  1 distance-1 nodes are in main.json (should be in intra)

### Queens Borough President (`city:bp_queens`)
- ⚠️  1 distance-1 nodes are in main.json (should be in intra)

### Staten Island Borough President (`city:bp_staten_island`)
- ⚠️  1 distance-1 nodes are in main.json (should be in intra)

### NY State Constitution (`state:ny_state_constitution`)
- ⚠️  4 distance-1 nodes are in main.json (should be in intra)

### Governor of New York (`state:governor_ny`)
- ⚠️  2 distance-1 nodes are in main.json (should be in intra)

### NY State Legislature (`state:state_legislature`)
- ⚠️  4 distance-1 nodes are in main.json (should be in intra)

### State Comptroller (`state:state_comptroller`)
- ⚠️  1 distance-1 nodes are in main.json (should be in intra)

### NY State Assembly (`state:state_assembly`)
- ⚠️  1 distance-1 nodes are in main.json (should be in intra)

### NY State Senate (`state:state_senate`)
- ⚠️  1 distance-1 nodes are in main.json (should be in intra)

### State Agencies (`state:state_agencies`)
- ⚠️  1 distance-1 nodes are in main.json (should be in intra)

### Public Authorities (`state:public_authorities`)
- ⚠️  9 distance-1 nodes are in main.json (should be in intra)

### U.S. Constitution (`federal:us_constitution`)
- ⚠️  3 distance-1 nodes are in main.json (should be in intra)

### President of the United States (`federal:president`)
- ⚠️  2 distance-1 nodes are in main.json (should be in intra)

### U.S. Congress (`federal:congress`)
- ⚠️  3 distance-1 nodes are in main.json (should be in intra)

### U.S. Senate (`federal:senate`)
- ⚠️  1 distance-1 nodes are in main.json (should be in intra)

### U.S. House of Representatives (`federal:house_of_representatives`)
- ⚠️  1 distance-1 nodes are in main.json (should be in intra)

### Supreme Court of the United States (`federal:supreme_court`)
- ⚠️  1 distance-1 nodes are in main.json (should be in intra)

### Federal Agencies (`federal:federal_agencies`)
- ⚠️  1 distance-1 nodes are in main.json (should be in intra)

---

## Summary

This analysis shows the current state of node distribution by edge distance.
Review the totals and issues to determine if nodes need to be:
- Moved from main to intra
- Created in intra or intra-detailed
- Moved from intra to intra-detailed

