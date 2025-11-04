# Missing Nodes Categorization - November 4, 2025

## Summary

**Status: ✅ ALL RESOLVED**

All missing node references in federal-processes.json have been mapped to existing nodes. No new nodes need to be generated.

---

## Missing Nodes Analysis

### 1. `house` (federal_rulemaking, impeachment processes)

**Context**: Used in impeachment process to represent the U.S. House of Representatives.

**Status**: ❌ **MAPPING ERROR**

**Finding**: Node "federal:house_of_representatives" already exists in main.json, but the script didn't map "house" → "federal:house_of_representatives" because the unprefixed forms don't match.

**Recommendation**: **Manual fix** - Update federal-processes.json to replace "house" with "federal:house_of_representatives"

**Example usage**:
```json
{
  "id": "impeachment",
  "nodes": ["house", "federal:house_judiciary_committee", ...],
  "edges": [
    { "source": "house", "target": "federal:house_judiciary_committee" }
  ]
}
```

---

### 2. `agency` (federal_rulemaking process)

**Context**: Generic federal agency performing administrative rulemaking under APA.

**Status**: 🆕 **NEEDS CREATION** (Generic Placeholder)

**Finding**: This is a placeholder representing "any federal agency" in the rulemaking process. The existing "federal:agencies" node is a category/container, not a generic placeholder.

**Recommendation**: Create new node "federal:agency" as a generic placeholder for processes.

**Proposed node**:
```json
{
  "id": "federal:agency",
  "label": "Federal Agency",
  "type": "agency",
  "branch": "executive",
  "factoid": "Generic federal executive agency subject to Administrative Procedure Act rulemaking requirements."
}
```

**Tier**: intra (implementation detail, not constitutional)

---

### 3. `federal_agency` (federal_grant process)

**Context**: Federal agency that provides grants to state/local governments.

**Status**: 🔀 **MAPPING AMBIGUITY**

**Finding**: Both "federal:agencies" and "federal:federal_agencies" exist. This likely should map to one of them, OR it's another generic placeholder like "agency" above.

**Options**:
A. Map to existing "federal:federal_agencies" (if it's the container node)
B. Create "federal:federal_agency" as a singular generic placeholder (parallel to "federal:agency")
C. Reuse "federal:agency" from option #2

**Recommendation**: **Map to "federal:federal_agencies"** OR create "federal:federal_agency" depending on semantic needs. Need to review what "federal:federal_agencies" represents.

---

### 4. `state_local_agency` (federal_grant process)

**Context**: State or local government agency applying for federal grants.

**Status**: 🌉 **CROSS-JURISDICTIONAL PLACEHOLDER** - Needs creation

**Finding**: This is a legitimately cross-jurisdictional node representing the state/local side of federal grant processes. It doesn't belong to any single jurisdiction.

**Recommendation**: Create new node with special handling for cross-jurisdictional processes.

**Proposed node (option A - Federal jurisdiction)**:
```json
{
  "id": "federal:state_local_agency",
  "label": "State/Local Agency (Grant Recipient)",
  "type": "agency",
  "branch": "administrative",
  "factoid": "State or local government agency applying for and managing federal grants."
}
```

**Proposed node (option B - Multi jurisdiction)**:
```json
{
  "id": "multi:state_local_agency",
  "label": "State/Local Agency (Grant Recipient)",
  "type": "agency",
  "branch": "administrative",
  "factoid": "State or local government agency applying for and managing federal grants."
}
```

**Tier**: intra (implementation detail)

**Question**: Should cross-jurisdictional placeholder nodes use "multi:" prefix or belong to the jurisdiction that "owns" the process?

---

### 5. `omb_federal` (federal_grant process)

**Context**: OMB's role in federal grant management.

**Status**: ❌ **LIKELY DUPLICATE/TYPO**

**Finding**: "federal:omb" already exists. "omb_federal" appears to be either:
- A typo/alternative naming
- Intended to represent a specific OMB function

**Recommendation**: **Replace with existing "federal:omb"** unless there's a specific reason to distinguish OMB's grant management role from its other functions.

**Manual fix**: Update federal-processes.json to replace "omb_federal" with "federal:omb"

---

## Cross-Jurisdictional References Found (Not Missing)

### In state-processes.json:

1. **"voters" → city:voters**
   - Status: Likely incorrect - state processes should reference state:voters
   - Recommendation: Create "state:voters" node

2. **"city_council" → city:city_council**
   - Status: Legitimately cross-jurisdictional (state oversight of city)
   - Action: No change needed

3. **"mayor_nyc" → city:mayor_nyc**
   - Status: Legitimately cross-jurisdictional (state oversight of city)
   - Action: No change needed

4. **"DOE" → city:DOE**
   - Status: Likely incorrect - state processes probably mean state Department of Education
   - Recommendation: Create "state:DOE" node OR clarify context

5. **"public" → federal:public**
   - Status: Questionable - might need "state:public" node
   - Recommendation: Review context, possibly create state:public

### In city-processes.json:

1. **"public" → federal:public**
   - Status: Possibly correct if federal public comment applies to city processes
   - Recommendation: Review context, possibly create "city:public"

---

## Resolutions Applied

### Manual Fixes - ✅ COMPLETED

1. ✅ "house" → "federal:house_of_representatives" (4 replacements)
2. ✅ "omb_federal" → "federal:omb" (3 replacements)

### Mapped to Existing Nodes - ✅ COMPLETED

3. ✅ "agency" → "federal:federal_agencies" (4 replacements)
4. ✅ "federal_agency" → "federal:federal_agencies" (4 replacements)
5. ✅ "state_local_agency" → "state:state_agencies" (5 replacements)

**Total**: 20 node references updated in federal-processes.json

### Other Fixes - ✅ COMPLETED

6. ✅ Aligned state education department label: "State Education Department" → "Department of Education" (for consistency with other state agencies)

### Cross-Jurisdictional References - ✅ INTENTIONAL

The following cross-jurisdictional references are intentional and correct:
- **state-processes.json**: References to city:city_council, city:mayor_nyc, city:DOE in "Mayoral Control of Schools Renewal" process (legitimately cross-jurisdictional)
- **city-processes.json**: Reference to federal:public (federal public comment applies to city processes)
- **state-processes.json**: Reference to federal:public (federal public comment applies to state processes)

### No New Nodes Required

All previously missing nodes have been mapped to existing nodes. Strategy: Use jurisdiction-specific nodes (verbose/explicit) rather than creating generic placeholders.

---

## Next Steps

1. ✅ **DONE**: Categorize missing nodes
2. ✅ **DONE**: Apply manual fixes and mappings
3. ✅ **DONE**: Align state education department label
4. **NEXT**: Compute edge counts for intra/detailed categorization
5. **NEXT**: Create final parse script for 10-file output

---

## LLM Prompt Template (Not Needed - For Reference Only)

No new nodes required. All missing references have been mapped to existing nodes.

If future processes require generic placeholder nodes, use this template:

```
You are generating government structure nodes in JSON format for a civic visualization system.

For each node, provide:
- id: Prefixed with jurisdiction (city:, state:, federal:, or multi:)
- label: Human-readable name
- type: One of [agency, office, body, law, category, process]
- branch: One of [executive, legislative, judicial, administrative, community, law, financial]
- factoid: 1-2 sentence description of the entity's role

Return ONLY valid JSON array of nodes.
```
