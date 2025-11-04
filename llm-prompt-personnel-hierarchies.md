# LLM Prompt: Generate Personnel Hierarchy Nodes

You are generating internal organizational personnel hierarchies for government offices. Generate nodes and edges following the existing data structure patterns.

## Data Structure Requirements

### Node Format
```json
{
  "id": "jurisdiction:unique_id",
  "label": "Display Name",
  "type": "office|position|committee",
  "branch": "executive|legislative",
  "factoid": "One sentence description of role and responsibilities."
}
```

### Edge Format
```json
{
  "source": "jurisdiction:parent_id",
  "target": "jurisdiction:child_id",
  "relation": "contains|reports_to",
  "category": "hierarchical"
}
```

## Jurisdiction Prefixes
- City: `city:`
- State: `state:`
- Federal: `federal:`

## Node Types
- `office`: Formal office or position (Chief of Staff, Speaker, etc.)
- `position`: Staff positions (Deputy, Advisor, etc.)
- `committee`: Legislative committees

## Relations
- `contains`: Parent contains/includes child in organizational structure
- `reports_to`: Child reports to parent (use for direct reporting relationships)

---

## Task 1: NYC Mayor's Office Internal Structure

Generate nodes for the Mayor's internal office structure anchored to `city:mayor_nyc`.

**Structure to model:**
- Mayor
  - Chief of Staff
  - First Deputy Mayor
  - Deputy Mayor for Strategic Policy Initiatives
  - Deputy Mayor for Health and Human Services
  - Deputy Mayor for Housing and Economic Development
  - Deputy Mayor for Public Safety
  - Deputy Mayor for Operations
  - Counsel to the Mayor
  - Director of Mayor's Office of Operations
  - Press Secretary
  - Director of Intergovernmental Affairs

**Node ID pattern**: `city:mayor_office_{role}` (use snake_case, abbreviate where needed)

**Example nodes:**
```json
{
  "id": "city:mayor_office_chief_of_staff",
  "label": "Chief of Staff to the Mayor",
  "type": "office",
  "branch": "executive",
  "factoid": "Oversees the Mayor's senior staff and coordinates policy initiatives across city agencies."
}
```

**Generate:**
1. All nodes for the structure above
2. Edges connecting `city:mayor_nyc` to Chief of Staff
3. Edges connecting Chief of Staff to Deputy Mayors and other direct reports
4. Return as valid JSON

---

## Task 2: NYC City Council Internal Structure

Generate nodes for City Council internal leadership anchored to `city:city_council`.

**Structure to model:**
- City Council
  - Speaker of the Council
  - Majority Leader
  - Finance Committee (Chair)
  - Land Use Committee (Chair)
  - Public Safety Committee (Chair)
  - Transportation Committee (Chair)
  - Education Committee (Chair)
  - Health Committee (Chair)
  - General Welfare Committee (Chair)

**Node ID pattern**: `city:council_{role}` (use snake_case)

**Committee type**: Use `"type": "committee"` for committees, `"type": "office"` for leadership positions

**Generate:**
1. All nodes for the structure above
2. Edges connecting council to speaker
3. Edges connecting speaker to majority leader
4. Edges connecting council to major committees
5. Return as valid JSON

---

## Task 3: NY Governor's Office Internal Structure

Generate nodes for the Governor's internal office structure anchored to `state:governor_ny`.

**Structure to model:**
- Governor
  - Lieutenant Governor
  - Secretary to the Governor
  - Chief of Staff
  - Deputy Secretary for Public Safety
  - Deputy Secretary for Health and Human Services
  - Deputy Secretary for Economic Development
  - Deputy Secretary for Energy and Environment
  - Deputy Secretary for Education
  - Counsel to the Governor
  - Director of State Operations
  - Communications Director

**Node ID pattern**: `state:governor_office_{role}`

**Generate:**
1. All nodes for the structure above
2. Edges connecting governor to lieutenant governor and secretary
3. Edges connecting secretary to chief of staff and deputy secretaries
4. Return as valid JSON

---

## Task 4: NY State Assembly Internal Structure

Generate nodes for State Assembly leadership anchored to `state:state_assembly`.

**Structure to model:**
- State Assembly
  - Speaker of the Assembly
  - Majority Leader
  - Ways and Means Committee (Chair)
  - Codes Committee (Chair)
  - Rules Committee (Chair)
  - Judiciary Committee (Chair)
  - Education Committee (Chair)
  - Health Committee (Chair)

**Node ID pattern**: `state:assembly_{role}`

**Generate:**
1. All nodes for the structure above
2. Edges connecting assembly to speaker
3. Edges connecting speaker to majority leader
4. Edges connecting assembly to major committees
5. Return as valid JSON

---

## Task 5: NY State Senate Internal Structure

Generate nodes for State Senate leadership anchored to `state:state_senate`.

**Structure to model:**
- State Senate
  - President Pro Tempore (Majority Leader)
  - Deputy Majority Leader
  - Finance Committee (Chair)
  - Codes Committee (Chair)
  - Rules Committee (Chair)
  - Judiciary Committee (Chair)
  - Education Committee (Chair)
  - Health Committee (Chair)

**Node ID pattern**: `state:senate_{role}`

**Generate:**
1. All nodes for the structure above
2. Edges connecting senate to president pro tem
3. Edges connecting president pro tem to deputy leader
4. Edges connecting senate to major committees
5. Return as valid JSON

---

## Task 6: White House / Executive Office of the President

Generate nodes for the President's internal office structure anchored to `federal:president`.

**Structure to model:**
- President
  - Vice President
  - Chief of Staff
  - Deputy Chief of Staff for Operations
  - Deputy Chief of Staff for Policy
  - Senior Advisor
  - National Security Advisor
  - Counsel to the President
  - Press Secretary
  - Director of Communications
  - Director of Office of Management and Budget
  - National Economic Council Director
  - Domestic Policy Council Director

**Node ID pattern**: `federal:white_house_{role}` or `federal:eop_{role}` for Executive Office positions

**Generate:**
1. All nodes for the structure above
2. Edges connecting president to vice president and chief of staff
3. Edges connecting chief of staff to deputies and senior staff
4. Return as valid JSON

---

## Task 7: U.S. Senate Internal Structure

Generate nodes for U.S. Senate leadership anchored to `federal:senate`.

**Structure to model:**
- U.S. Senate
  - President of the Senate (Vice President) - already exists as `federal:vice_president`
  - President Pro Tempore
  - Majority Leader
  - Minority Leader
  - Appropriations Committee (Chair)
  - Finance Committee (Chair)
  - Judiciary Committee (Chair)
  - Foreign Relations Committee (Chair)
  - Armed Services Committee (Chair)

**Node ID pattern**: `federal:senate_{role}`

**Generate:**
1. All nodes for the structure above (except Vice President - use existing node)
2. Edges connecting senate to president pro tem
3. Edges connecting president pro tem to majority/minority leaders
4. Edges connecting senate to major committees
5. Return as valid JSON

---

## Task 8: U.S. House of Representatives Internal Structure

Generate nodes for U.S. House leadership anchored to `federal:house_of_representatives`.

**Structure to model:**
- U.S. House of Representatives
  - Speaker of the House
  - Majority Leader
  - Minority Leader
  - Majority Whip
  - Appropriations Committee (Chair)
  - Ways and Means Committee (Chair)
  - Rules Committee (Chair)
  - Judiciary Committee (Chair)
  - Energy and Commerce Committee (Chair)

**Node ID pattern**: `federal:house_{role}`

**Generate:**
1. All nodes for the structure above
2. Edges connecting house to speaker
3. Edges connecting speaker to majority leader and majority whip
4. Edges connecting house to major committees
5. Return as valid JSON

---

## Output Format

For each task, provide:

```json
{
  "task": "Task number and name",
  "nodes": [
    { /* node objects */ }
  ],
  "edges": [
    { /* edge objects */ }
  ]
}
```

## Guidelines

1. **Factoids**: Write concise, informative one-sentence descriptions
2. **IDs**: Use snake_case, keep them short but descriptive
3. **Hierarchy**: Parent → Child edges using "contains" relation
4. **Committees**: Use type "committee", not "office"
5. **Branch**: Use "executive" for executive offices, "legislative" for legislative bodies
6. **Consistency**: Follow the exact patterns from existing data
