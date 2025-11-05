# Scripts Directory

Migration and data management scripts for the subview system refactor.

## Phase 0: Data Migration & Cleanup

### 1. Validate Node References

Checks that all nodes referenced in processes and subgraphs exist in main graph files.

```bash
npx tsx scripts/validate-node-refs.ts
```

**Output:**
- Lists missing nodes by jurisdiction
- Suggests similar node IDs for possible typos
- Exits with code 1 if validation fails

---

### 2. Generate Missing Nodes (External LLM)

Use the prompts in [`.claude/llm-node-generation-prompt.md`](../.claude/llm-node-generation-prompt.md) to generate missing nodes with an LLM (ChatGPT, Claude, etc.).

**Save generated nodes as:**
- `city-generated-nodes.json`
- `state-generated-nodes.json`
- `federal-generated-nodes.json`

**Format:** JSON array of node objects:
```json
[
  {
    "id": "NYPD",
    "label": "New York Police Department",
    "type": "agency",
    "branch": "executive",
    "factoid": "Largest municipal police force in the US, responsible for law enforcement and public safety across NYC's five boroughs."
  }
]
```

---

### 3. Merge Generated Nodes

Merges LLM-generated nodes into main jurisdiction files.

```bash
# Dry run (preview changes without modifying files)
npx tsx scripts/merge-generated-nodes.ts city city-generated-nodes.json --dry-run

# Actually merge
npx tsx scripts/merge-generated-nodes.ts city city-generated-nodes.json
npx tsx scripts/merge-generated-nodes.ts state state-generated-nodes.json
npx tsx scripts/merge-generated-nodes.ts federal federal-generated-nodes.json
```

**What it does:**
- Validates generated nodes
- Checks for duplicate IDs
- Creates backup (.backup file)
- Merges and sorts nodes alphabetically
- Skips duplicates with warning

**Output:**
- `data/city.json.backup` (backup before merge)
- Updated `data/city.json` with new nodes

---

### 4. Validate Again

After merging, re-run validation to confirm all references are resolved:

```bash
npx tsx scripts/validate-node-refs.ts
```

Should show: `✅ VALIDATION PASSED - All references valid`

---

## Future Scripts (To Be Created)

### Phase 0 (continued):

- `migrate-node-namespaces.ts` - Add jurisdiction prefixes to node IDs
- `add-edge-metadata.ts` - Add edge IDs and relation taxonomy
- `verify-data-structure.ts` - Final validation of migrated data

### Phase 1:

- `migrate-to-subviews.ts` - Convert processes/subgraphs to subview format

---

## Troubleshooting

**"ReferenceError: __dirname is not defined"**
- Script is missing ES module setup
- Add at top of file:
  ```typescript
  import { fileURLToPath } from 'url';
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  ```

**"Validation errors found"**
- Check generated JSON for missing required fields (id, label, type, branch, factoid)
- Ensure factoids are at least 20 characters
- Fix in generated file and re-run merge

**"Duplicate IDs"**
- Merge script will skip duplicates automatically
- Review warnings to confirm these are intentional
- If you want to replace existing nodes, delete them from main file first
