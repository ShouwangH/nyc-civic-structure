# Inter vs Intra View Analysis

**Inter views**: Show relationships TO OTHER entities (proposes, enacts, approves, oversees)
**Intra views**: Show INTERNAL structure (contains, departments, bureaus, divisions)

---

## City

### Main Nodes

#### NYC Charter (`city:nyc_charter`)
- Type: law
- Branch: law

**Inter view** (4 relationships):
  - establishes → Mayor (main)
  - establishes → Comptroller (main)
  - establishes → Public Advocate (main)
  - establishes → City Council (main)

**Intra view** (4 internal children):
  - Mayor (main)
  - Comptroller (main)
  - Public Advocate (main)
  - City Council (main)

#### Mayor (`city:mayor_nyc`)
- Type: office
- Branch: executive

**Inter view** (3 relationships):
  - proposes → NYC Budget (main)
  - oversees → NYC Departments & Agencies (main)
  - ← establishes from NYC Charter (main)

**Intra view** (45 internal children):
  - NYC Departments & Agencies (main)
  - NYC Budget (main)
  - NYC Departments & Agencies (main)
  - Department for the Aging (city-intra)
  - Department of Buildings (city-intra)
  - Business Integrity Commission (city-intra)
  - Administration for Children's Services (city-intra)
  - Department of City Planning (city-intra)
  - Department of Citywide Administrative Services (city-intra)
  - Department of Consumer and Worker Protection (city-intra)
  - ... and 35 more

#### Comptroller (`city:comptroller`)
- Type: office
- Branch: executive

**Inter view** (2 relationships):
  - audits → NYC Budget (main)
  - ← establishes from NYC Charter (main)

**Intra view** (5 internal children):
  - NYC Budget (main)
  - Bureau of Audit (city-intra)
  - Bureau of Asset Management (city-intra)
  - Bureau of Accountancy (city-intra)
  - Bureau of Public Finance (city-intra)

#### Public Advocate (`city:public_advocate`)
- Type: office
- Branch: executive

**Inter view** (2 relationships):
  - non-voting member → City Council (main)
  - ← establishes from NYC Charter (main)

**Intra view** (1 internal children):
  - City Council (main)

#### City Council (`city:city_council`)
- Type: body
- Branch: legislative

**Inter view** (4 relationships):
  - enacts → Administrative Code (main)
  - approves → NYC Budget (main)
  - ← establishes from NYC Charter (main)
  - ← non-voting member from Public Advocate (main)

**Intra view** (2 internal children):
  - Administrative Code (main)
  - NYC Budget (main)

#### NYC Departments & Agencies (`city:departments`)
- Type: agency
- Branch: administrative

**Inter view** (2 relationships):
  - ← appoints_commissioners from Mayor (main)
  - ← oversees from Mayor (main)

**Intra view** (43 internal children):
  - Rules of the City of New York (main)
  - Department for the Aging (city-intra)
  - Department of Buildings (city-intra)
  - Business Integrity Commission (city-intra)
  - Administration for Children's Services (city-intra)
  - Department of City Planning (city-intra)
  - Department of Citywide Administrative Services (city-intra)
  - Department of Consumer and Worker Protection (city-intra)
  - Department of Correction (city-intra)
  - Department of Cultural Affairs (city-intra)
  - ... and 33 more

#### Administrative Code (`city:administrative_code`)
- Type: law
- Branch: law

**Inter view** (1 relationships):
  - ← enacts from City Council (main)

**Intra view**: None needed (no internal structure)

#### Rules of the City of New York (`city:rules_of_city`)
- Type: law
- Branch: law

**Inter view** (1 relationships):
  - ← promulgates from NYC Departments & Agencies (main)

**Intra view**: None needed (no internal structure)

#### NYC Budget (`city:nyc_budget`)
- Type: process
- Branch: financial

**Inter view** (3 relationships):
  - ← proposes from Mayor (main)
  - ← approves from City Council (main)
  - ← audits from Comptroller (main)

**Intra view**: None needed (no internal structure)

#### Borough Advisory Structure (`city:borough_structure`)
- Type: category
- Branch: community

**Inter view**: None needed (no cross-entity relationships)

**Intra view** (5 internal children):
  - Manhattan Borough President (main)
  - Brooklyn Borough President (main)
  - Bronx Borough President (main)
  - Queens Borough President (main)
  - Staten Island Borough President (main)

#### Manhattan Borough President (`city:bp_manhattan`)
- Type: office
- Branch: community

**Inter view** (1 relationships):
  - ← includes from Borough Advisory Structure (main)

**Intra view** (1 internal children):
  - Manhattan Community Boards (12) (main)

#### Brooklyn Borough President (`city:bp_brooklyn`)
- Type: office
- Branch: community

**Inter view** (1 relationships):
  - ← includes from Borough Advisory Structure (main)

**Intra view** (1 internal children):
  - Brooklyn Community Boards (18) (main)

#### Bronx Borough President (`city:bp_bronx`)
- Type: office
- Branch: community

**Inter view** (1 relationships):
  - ← includes from Borough Advisory Structure (main)

**Intra view** (1 internal children):
  - Bronx Community Boards (12) (main)

#### Queens Borough President (`city:bp_queens`)
- Type: office
- Branch: community

**Inter view** (1 relationships):
  - ← includes from Borough Advisory Structure (main)

**Intra view** (1 internal children):
  - Queens Community Boards (14) (main)

#### Staten Island Borough President (`city:bp_staten_island`)
- Type: office
- Branch: community

**Inter view** (1 relationships):
  - ← includes from Borough Advisory Structure (main)

**Intra view** (1 internal children):
  - Staten Island Community Boards (3) (main)

#### Manhattan Community Boards (12) (`city:cb_manhattan`)
- Type: body
- Branch: community

**Inter view** (1 relationships):
  - ← appoints_members from Manhattan Borough President (main)

**Intra view**: None needed (no internal structure)

#### Brooklyn Community Boards (18) (`city:cb_brooklyn`)
- Type: body
- Branch: community

**Inter view** (1 relationships):
  - ← appoints_members from Brooklyn Borough President (main)

**Intra view**: None needed (no internal structure)

#### Bronx Community Boards (12) (`city:cb_bronx`)
- Type: body
- Branch: community

**Inter view** (1 relationships):
  - ← appoints_members from Bronx Borough President (main)

**Intra view**: None needed (no internal structure)

#### Queens Community Boards (14) (`city:cb_queens`)
- Type: body
- Branch: community

**Inter view** (1 relationships):
  - ← appoints_members from Queens Borough President (main)

**Intra view**: None needed (no internal structure)

#### Staten Island Community Boards (3) (`city:cb_staten_island`)
- Type: body
- Branch: community

**Inter view** (1 relationships):
  - ← appoints_members from Staten Island Borough President (main)

**Intra view**: None needed (no internal structure)

---

### Intra Nodes (with children)

#### New York Police Department (`city:NYPD`)
- Type: agency

**Intra view** (7 internal children):
  - Patrol Bureau
  - Detective Bureau
  - Transit Bureau
  - Housing Bureau
  - Counterterrorism Bureau
  - Intelligence Bureau
  - Internal Affairs Bureau

#### Fire Department of New York (`city:FDNY`)
- Type: agency

**Intra view** (4 internal children):
  - Bureau of Fire Operations
  - Bureau of Emergency Medical Services
  - Bureau of Fire Prevention
  - Bureau of Training

#### Department of Education (`city:DOE`)
- Type: agency

**Intra view** (6 internal children):
  - Division of Instructional and Informational Technology
  - Division of School Quality
  - Division of Early Childhood Education
  - Division of Multilingual Learners
  - Division of Special Education
  - Division of School Facilities

#### Department of Health and Mental Hygiene (`city:DOHMH`)
- Type: agency

**Intra view** (4 internal children):
  - Bureau of Communicable Disease
  - Bureau of Vital Statistics
  - Bureau of Mental Health
  - Bureau of Environmental Health

#### Department of Homeless Services (`city:DHS`)
- Type: agency

**Intra view** (4 internal children):
  - Adult Family Services
  - Family Services
  - Prevention Services
  - Outreach and Intake

#### Human Resources Administration (`city:HRA`)
- Type: agency

**Intra view** (4 internal children):
  - Office of Adult Services
  - Family Independence Administration
  - HIV/AIDS Services Administration
  - Medical Assistance Program

#### Department of Housing Preservation and Development (`city:HPD`)
- Type: agency

**Intra view** (4 internal children):
  - Division of Housing Preservation
  - Division of Housing Development
  - Division of Code Enforcement
  - Division of Neighborhood Preservation

#### Department of Transportation (`city:DOT`)
- Type: agency

**Intra view** (4 internal children):
  - Division of Traffic Operations
  - Division of Infrastructure
  - Division of Bridges
  - Division of Ferries

#### Department of Sanitation (`city:DSNY`)
- Type: agency

**Intra view** (3 internal children):
  - Bureau of Cleaning and Collection
  - Bureau of Recycling and Sustainability
  - Bureau of Motor Equipment

#### Office of Management and Budget (`city:OMB`)
- Type: office

**Intra view** (4 internal children):
  - Budget Division
  - Economic and Revenue Analysis
  - Operations Unit
  - Management Analysis

---

## State

### Main Nodes

#### NY State Constitution (`state:ny_state_constitution`)
- Type: law
- Branch: law

**Inter view** (5 relationships):
  - establishes → Governor of New York (main)
  - establishes → NY State Legislature (main)
  - establishes → State Judicial System (main)
  - establishes → State Comptroller (main)
  - establishes → State Judicial System (main)

**Intra view** (5 internal children):
  - Governor of New York (main)
  - NY State Legislature (main)
  - State Judicial System (main)
  - State Comptroller (main)
  - State Judicial System (main)

#### Governor of New York (`state:governor_ny`)
- Type: office
- Branch: executive

**Inter view** (4 relationships):
  - proposes → State Budget (main)
  - oversees → State Agencies (main)
  - oversees → State Agencies (main)
  - ← establishes from NY State Constitution (main)

**Intra view** (30 internal children):
  - State Budget (main)
  - State Agencies (main)
  - State Agencies (main)
  - Department of State (state-intra)
  - Department of Transportation (state-intra)
  - Department of Health (state-intra)
  - Department of Education (state-intra)
  - Department of Environmental Conservation (state-intra)
  - Department of Labor (state-intra)
  - Department of Taxation and Finance (state-intra)
  - ... and 20 more

#### NY State Legislature (`state:state_legislature`)
- Type: body
- Branch: legislative

**Inter view** (3 relationships):
  - adopts → State Budget (main)
  - creates → Public Authorities (main)
  - ← establishes from NY State Constitution (main)

**Intra view** (4 internal children):
  - State Budget (main)
  - NY State Assembly (main)
  - NY State Senate (main)
  - Public Authorities (main)

#### State Judicial System (`state:state_judiciary`)
- Type: body
- Branch: judicial

**Inter view** (2 relationships):
  - ← establishes from NY State Constitution (main)
  - ← establishes from NY State Constitution (main)

**Intra view** (1 internal children):
  - Court of Appeals (state-intra)

#### State Comptroller (`state:state_comptroller`)
- Type: office
- Branch: executive

**Inter view** (2 relationships):
  - audits → State Budget (main)
  - ← establishes from NY State Constitution (main)

**Intra view** (5 internal children):
  - State Budget (main)
  - Office of Operations and State Audit (state-intra)
  - Office of Local Government and School Accountability (state-intra)
  - Office of Retirement Services (state-intra)
  - Office of Investment Management (state-intra)

#### State Budget (`state:state_budget`)
- Type: process
- Branch: financial

**Inter view** (3 relationships):
  - ← adopts from NY State Legislature (main)
  - ← proposes from Governor of New York (main)
  - ← audits from State Comptroller (main)

**Intra view**: None needed (no internal structure)

#### NY State Assembly (`state:state_assembly`)
- Type: body
- Branch: legislative

**Inter view** (2 relationships):
  - enacts → NY Consolidated Laws (main)
  - ← includes from NY State Legislature (main)

**Intra view** (1 internal children):
  - NY Consolidated Laws (main)

#### NY State Senate (`state:state_senate`)
- Type: body
- Branch: legislative

**Inter view** (2 relationships):
  - enacts → NY Consolidated Laws (main)
  - ← includes from NY State Legislature (main)

**Intra view** (1 internal children):
  - NY Consolidated Laws (main)

#### NY Consolidated Laws (`state:ny_consolidated_laws`)
- Type: law
- Branch: law

**Inter view** (2 relationships):
  - ← enacts from NY State Senate (main)
  - ← enacts from NY State Assembly (main)

**Intra view**: None needed (no internal structure)

#### NY Codes, Rules & Regulations (NYCRR) (`state:nycrr`)
- Type: law
- Branch: administrative

**Inter view** (1 relationships):
  - ← issues from State Agencies (main)

**Intra view**: None needed (no internal structure)

#### State Agencies (`state:state_agencies`)
- Type: agency
- Branch: administrative

**Inter view** (2 relationships):
  - ← oversees from Governor of New York (main)
  - ← oversees from Governor of New York (main)

**Intra view** (27 internal children):
  - NY Codes, Rules & Regulations (NYCRR) (main)
  - Department of State (state-intra)
  - Department of Transportation (state-intra)
  - Department of Health (state-intra)
  - Department of Education (state-intra)
  - Department of Environmental Conservation (state-intra)
  - Department of Labor (state-intra)
  - Department of Taxation and Finance (state-intra)
  - Department of Corrections and Community Supervision (state-intra)
  - Division of Criminal Justice Services (state-intra)
  - ... and 17 more

#### Public Authorities (`state:public_authorities`)
- Type: category
- Branch: law

**Inter view** (1 relationships):
  - ← creates from NY State Legislature (main)

**Intra view** (18 internal children):
  - Metropolitan Transportation Authority (MTA) (main)
  - New York State Thruway Authority (main)
  - New York Power Authority (NYPA) (main)
  - Dormitory Authority (DASNY) (main)
  - Empire State Development (ESD) (main)
  - Battery Park City Authority (BPCA) (main)
  - Roosevelt Island Operating Corporation (RIOC) (main)
  - Port Authority of New York and New Jersey (main)
  - New York City Housing Authority (NYCHA) (main)
  - Metropolitan Transportation Authority (MTA) (main)
  - ... and 8 more

#### Metropolitan Transportation Authority (MTA) (`state:mta`)
- Type: authority
- Branch: transportation

**Inter view** (2 relationships):
  - ← includes from Public Authorities (main)
  - ← establishes from Public Authorities (main)

**Intra view**: None needed (no internal structure)

#### New York State Thruway Authority (`state:nys_thruway`)
- Type: authority
- Branch: transportation

**Inter view** (2 relationships):
  - ← includes from Public Authorities (main)
  - ← establishes from Public Authorities (main)

**Intra view**: None needed (no internal structure)

#### New York Power Authority (NYPA) (`state:nypa`)
- Type: authority
- Branch: energy

**Inter view** (2 relationships):
  - ← includes from Public Authorities (main)
  - ← establishes from Public Authorities (main)

**Intra view**: None needed (no internal structure)

#### Dormitory Authority (DASNY) (`state:dasny`)
- Type: authority
- Branch: finance

**Inter view** (2 relationships):
  - ← includes from Public Authorities (main)
  - ← establishes from Public Authorities (main)

**Intra view**: None needed (no internal structure)

#### Empire State Development (ESD) (`state:esd`)
- Type: authority
- Branch: economic

**Inter view** (2 relationships):
  - ← includes from Public Authorities (main)
  - ← establishes from Public Authorities (main)

**Intra view**: None needed (no internal structure)

#### Battery Park City Authority (BPCA) (`state:battery_park_city_authority`)
- Type: authority
- Branch: development

**Inter view** (2 relationships):
  - ← includes from Public Authorities (main)
  - ← establishes from Public Authorities (main)

**Intra view**: None needed (no internal structure)

#### Roosevelt Island Operating Corporation (RIOC) (`state:roosevelt_island`)
- Type: authority
- Branch: development

**Inter view** (2 relationships):
  - ← includes from Public Authorities (main)
  - ← establishes from Public Authorities (main)

**Intra view**: None needed (no internal structure)

#### Port Authority of New York and New Jersey (`state:port_authority`)
- Type: bi_state_authority
- Branch: infrastructure

**Inter view** (2 relationships):
  - ← includes from Public Authorities (main)
  - ← creates from Public Authorities (main)

**Intra view**: None needed (no internal structure)

#### New York City Housing Authority (NYCHA) (`state:nycha`)
- Type: city_authority
- Branch: housing

**Inter view** (2 relationships):
  - ← includes from Public Authorities (main)
  - ← enables from Public Authorities (main)

**Intra view**: None needed (no internal structure)

#### Metropolitan Transportation Authority (MTA) (`state:mta`)
- Type: authority
- Branch: transportation

**Inter view** (2 relationships):
  - ← includes from Public Authorities (main)
  - ← establishes from Public Authorities (main)

**Intra view**: None needed (no internal structure)

#### New York State Thruway Authority (`state:nys_thruway`)
- Type: authority
- Branch: transportation

**Inter view** (2 relationships):
  - ← includes from Public Authorities (main)
  - ← establishes from Public Authorities (main)

**Intra view**: None needed (no internal structure)

#### New York Power Authority (NYPA) (`state:nypa`)
- Type: authority
- Branch: energy

**Inter view** (2 relationships):
  - ← includes from Public Authorities (main)
  - ← establishes from Public Authorities (main)

**Intra view**: None needed (no internal structure)

#### Dormitory Authority (DASNY) (`state:dasny`)
- Type: authority
- Branch: finance

**Inter view** (2 relationships):
  - ← includes from Public Authorities (main)
  - ← establishes from Public Authorities (main)

**Intra view**: None needed (no internal structure)

#### Empire State Development (ESD) (`state:esd`)
- Type: authority
- Branch: economic

**Inter view** (2 relationships):
  - ← includes from Public Authorities (main)
  - ← establishes from Public Authorities (main)

**Intra view**: None needed (no internal structure)

#### Battery Park City Authority (BPCA) (`state:battery_park_city_authority`)
- Type: authority
- Branch: development

**Inter view** (2 relationships):
  - ← includes from Public Authorities (main)
  - ← establishes from Public Authorities (main)

**Intra view**: None needed (no internal structure)

#### Roosevelt Island Operating Corporation (RIOC) (`state:roosevelt_island`)
- Type: authority
- Branch: development

**Inter view** (2 relationships):
  - ← includes from Public Authorities (main)
  - ← establishes from Public Authorities (main)

**Intra view**: None needed (no internal structure)

#### Port Authority of New York and New Jersey (`state:port_authority`)
- Type: bi_state_authority
- Branch: infrastructure

**Inter view** (2 relationships):
  - ← includes from Public Authorities (main)
  - ← creates from Public Authorities (main)

**Intra view**: None needed (no internal structure)

#### New York City Housing Authority (NYCHA) (`state:nycha`)
- Type: city_authority
- Branch: housing

**Inter view** (2 relationships):
  - ← includes from Public Authorities (main)
  - ← enables from Public Authorities (main)

**Intra view**: None needed (no internal structure)

---

### Intra Nodes (with children)

#### Court of Appeals (`state:court_of_appeals`)
- Type: court_high

**Inter view** (1 relationships):
  - reviews_from → Appellate Divisions

**Intra view** (1 internal children):
  - Appellate Divisions

#### Appellate Divisions (`state:appellate_divisions`)
- Type: court_appellate

**Inter view** (7 relationships):
  - reviews_from → Appellate Terms
  - reviews_from → Supreme Court
  - reviews_from → County Court
  - reviews_from → Family Court
  - reviews_from → Surrogate's Court
  - ... and 2 more

**Intra view** (6 internal children):
  - Appellate Terms
  - Supreme Court
  - County Court
  - Family Court
  - Surrogate's Court
  - Court of Claims

#### Appellate Terms (`state:appellate_terms`)
- Type: court_appellate

**Inter view** (3 relationships):
  - reviews_from → NYC Civil and Criminal Courts
  - reviews_from → District Courts
  - ← reviews_from from Appellate Divisions

**Intra view** (2 internal children):
  - NYC Civil and Criminal Courts
  - District Courts

#### County Court (`state:county_court`)
- Type: court_trial

**Inter view** (3 relationships):
  - reviews_from → City Courts
  - reviews_from → Town and Village Justice Courts
  - ← reviews_from from Appellate Divisions

**Intra view** (2 internal children):
  - City Courts
  - Town and Village Justice Courts

#### Department of Transportation (`state:dot_ny`)
- Type: agency

**Intra view** (4 internal children):
  - Office of Design
  - Office of Operations and Asset Management
  - Office of Traffic Safety and Mobility
  - Office of Construction

#### Department of Health (`state:doh_ny`)
- Type: agency

**Intra view** (4 internal children):
  - Office of Public Health
  - Office of Quality and Patient Safety
  - Office of Health Insurance Programs
  - Office of Primary Care and Health Systems Management

#### Department of Education (`state:sed_ny`)
- Type: agency

**Intra view** (4 internal children):
  - Office of Instructional Services
  - Office of School Operations and Management Services
  - Office of Special Education
  - Office of Higher Education

#### Department of Environmental Conservation (`state:dec_ny`)
- Type: agency

**Intra view** (5 internal children):
  - Division of Air Resources
  - Division of Water
  - Division of Lands and Forests
  - Division of Fish and Wildlife
  - Division of Environmental Remediation

#### Department of Labor (`state:dol_ny`)
- Type: agency

**Intra view** (4 internal children):
  - Unemployment Insurance Division
  - Division of Employment and Workforce Solutions
  - Division of Safety and Health
  - Division of Labor Standards

#### Department of Agriculture and Markets (`state:agm_ny`)
- Type: agency

**Intra view** (3 internal children):
  - Division of Food Safety and Inspection
  - Division of Animal Industry
  - Division of Plant Industry

#### Division of Homeland Security and Emergency Services (`state:dhses_ny`)
- Type: agency

**Intra view** (1 internal children):
  - New York State Police

#### New York State Police (`state:state_police_ny`)
- Type: agency

**Inter view** (1 relationships):
  - ← oversees from Division of Homeland Security and Emergency Services

**Intra view** (3 internal children):
  - Uniformed Force
  - Bureau of Criminal Investigation
  - Field Command

#### Office of Parks, Recreation and Historic Preservation (`state:parks_ny`)
- Type: agency

**Intra view** (3 internal children):
  - Operations Division
  - Planning and Development Division
  - Historic Preservation Division

#### Division of the Budget (`state:division_of_budget`)
- Type: office

**Intra view** (3 internal children):
  - Budget Planning and Review
  - Budget Operations and State Financial Systems
  - Office of Capital Programming and Management

#### Attorney General (`state:attorney_general`)
- Type: office

**Intra view** (3 internal children):
  - Division of Criminal Justice
  - Division of Economic Justice
  - Division of Social Justice

---

## Federal

### Main Nodes

#### U.S. Constitution (`federal:us_constitution`)
- Type: law
- Branch: law

**Inter view** (3 relationships):
  - establishes → President of the United States (main)
  - establishes → U.S. Congress (main)
  - establishes → Supreme Court of the United States (main)

**Intra view** (3 internal children):
  - President of the United States (main)
  - U.S. Congress (main)
  - Supreme Court of the United States (main)

#### President of the United States (`federal:president`)
- Type: office
- Branch: executive

**Inter view** (4 relationships):
  - oversees → Federal Agencies (main)
  - proposes → Federal Budget (main)
  - directs → Federal Agencies (main)
  - ← establishes from U.S. Constitution (main)

**Intra view** (24 internal children):
  - Federal Agencies (main)
  - Federal Budget (main)
  - Federal Agencies (main)
  - Department of State (federal-intra)
  - Department of the Treasury (federal-intra)
  - Department of Defense (federal-intra)
  - Department of Justice (federal-intra)
  - Department of the Interior (federal-intra)
  - Department of Agriculture (federal-intra)
  - Department of Commerce (federal-intra)
  - ... and 14 more

#### U.S. Congress (`federal:congress`)
- Type: body
- Branch: legislative

**Inter view** (2 relationships):
  - enacts → Federal Budget (main)
  - ← establishes from U.S. Constitution (main)

**Intra view** (3 internal children):
  - U.S. Senate (main)
  - U.S. House of Representatives (main)
  - Federal Budget (main)

#### U.S. Senate (`federal:senate`)
- Type: body
- Branch: legislative

**Inter view** (2 relationships):
  - enacts → United States Code (main)
  - ← includes from U.S. Congress (main)

**Intra view** (1 internal children):
  - United States Code (main)

#### U.S. House of Representatives (`federal:house_of_representatives`)
- Type: body
- Branch: legislative

**Inter view** (2 relationships):
  - enacts → United States Code (main)
  - ← includes from U.S. Congress (main)

**Intra view** (1 internal children):
  - United States Code (main)

#### Supreme Court of the United States (`federal:supreme_court`)
- Type: body
- Branch: judicial

**Inter view** (2 relationships):
  - oversees → Federal Court System (main)
  - ← establishes from U.S. Constitution (main)

**Intra view** (1 internal children):
  - Federal Court System (main)

#### Federal Court System (`federal:federal_courts`)
- Type: body
- Branch: judicial

**Inter view** (1 relationships):
  - ← oversees from Supreme Court of the United States (main)

**Intra view**: None needed (no internal structure)

#### Federal Budget (`federal:federal_budget`)
- Type: process
- Branch: financial

**Inter view** (2 relationships):
  - ← proposes from President of the United States (main)
  - ← enacts from U.S. Congress (main)

**Intra view**: None needed (no internal structure)

#### Federal Agencies (`federal:federal_agencies`)
- Type: agency
- Branch: administrative

**Inter view** (2 relationships):
  - ← oversees from President of the United States (main)
  - ← directs from President of the United States (main)

**Intra view** (29 internal children):
  - Code of Federal Regulations (CFR) (main)
  - Department of State (federal-intra)
  - Department of the Treasury (federal-intra)
  - Department of Defense (federal-intra)
  - Department of Justice (federal-intra)
  - Department of the Interior (federal-intra)
  - Department of Agriculture (federal-intra)
  - Department of Commerce (federal-intra)
  - Department of Labor (federal-intra)
  - Department of Health and Human Services (federal-intra)
  - ... and 19 more

#### United States Code (`federal:us_code`)
- Type: law
- Branch: law

**Inter view** (2 relationships):
  - ← enacts from U.S. Senate (main)
  - ← enacts from U.S. House of Representatives (main)

**Intra view**: None needed (no internal structure)

#### Code of Federal Regulations (CFR) (`federal:cfr`)
- Type: law
- Branch: administrative

**Inter view** (1 relationships):
  - ← promulgates from Federal Agencies (main)

**Intra view**: None needed (no internal structure)

---

### Intra Nodes (with children)

#### Department of State (`federal:state`)
- Type: agency

**Intra view** (4 internal children):
  - Bureau of Consular Affairs
  - Bureau of Diplomatic Security
  - Bureau of Political Affairs
  - Bureau of Economic and Business Affairs

#### Department of the Treasury (`federal:treasury`)
- Type: agency

**Intra view** (4 internal children):
  - Internal Revenue Service
  - Bureau of the Fiscal Service
  - United States Mint
  - Bureau of Engraving and Printing

#### Department of Defense (`federal:dod`)
- Type: agency

**Intra view** (6 internal children):
  - United States Army
  - United States Navy
  - United States Air Force
  - United States Marine Corps
  - United States Space Force
  - National Security Agency

#### Department of Justice (`federal:doj`)
- Type: agency

**Intra view** (5 internal children):
  - Federal Bureau of Investigation
  - Drug Enforcement Administration
  - Bureau of Alcohol, Tobacco, Firearms and Explosives
  - United States Marshals Service
  - Federal Bureau of Investigation

#### Department of Health and Human Services (`federal:hhs`)
- Type: agency

**Intra view** (4 internal children):
  - Centers for Disease Control and Prevention
  - Food and Drug Administration
  - Centers for Medicare and Medicaid Services
  - National Institutes of Health

#### Department of Transportation (`federal:dot`)
- Type: agency

**Intra view** (4 internal children):
  - Federal Highway Administration
  - Federal Transit Administration
  - Federal Aviation Administration
  - National Highway Traffic Safety Administration

#### Department of Education (`federal:education`)
- Type: agency

**Intra view** (4 internal children):
  - Office of Elementary and Secondary Education
  - Office of Postsecondary Education
  - Office of Special Education and Rehabilitative Services
  - Office for Civil Rights

#### Department of Homeland Security (`federal:dhs`)
- Type: agency

**Intra view** (6 internal children):
  - Federal Emergency Management Agency
  - Customs and Border Protection
  - Immigration and Customs Enforcement
  - U.S. Citizenship and Immigration Services
  - United States Secret Service
  - Federal Emergency Management Agency

#### Environmental Protection Agency (`federal:epa`)
- Type: agency

**Intra view** (4 internal children):
  - Office of Air and Radiation
  - Office of Water
  - Office of Land and Emergency Management
  - Office of Enforcement and Compliance Assurance

---

