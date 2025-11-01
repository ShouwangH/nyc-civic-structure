# 🧾 CodeRabbit Pull Review Summary
_Last updated: 2025-10-31_

## ✅ General Overview
CodeRabbit reviewed 35 modified files across city, state, and federal datasets, and key React/TypeScript graph components.  
The majority of files received **LGTM** (clean implementation, proper typing, logical structure).  
10 actionable and 8 nitpick comments were raised — most relating to **data integrity**, **React state stability**, and **minor UX or markdown cleanup**.

---

## ⚠️ Critical & Major Issues

### 1. **Data Integrity: Node ID Mismatches** ✅
**Files:**  
- `data/federal/processes.json`  
- `data/state/processes.json`  
- `data/state/structure.json`

**Problem:**  
Several process definitions reference node IDs that do not exist in their corresponding `structure.json` files.

**Fix Summary:**
- Updated federal and state structures to include the referenced offices/committees (e.g., OMB, OIRA, state comptroller, voters).
- Rewired process node lists and edges to use those canonical IDs.
- Structure `process` arrays now reference the actual process identifiers.

---

### 2. **GraphCanvas Store Rebuild Loop** ✅
**File:** `src/components/GraphCanvas.tsx`

**Problem:**  
The effect that initializes the `GraphOrchestrator` re-runs on every render because `storeActions` is recreated by reference.

**Fix Summary:**
- GraphCanvas now memoises the store payload off stable callbacks, preventing Cytoscape re-initialisation on every render.

---

### 3. **Unstable Actions Reference** ✅
**File:** `src/state/useVisualizationState.ts`

**Problem:**  
`actions` object recreated each render, triggering downstream re-initializations.

**Fix Summary:**
- Wrapped returned `actions` in `useMemo`, so consumers receive a stable reference.

---

### 4. **Restore Preset Layouts Before Re-layout** ✅
**File:** `src/graph/controller.ts`

**Problem:**  
When clearing process highlights, layout re-runs distort preset node positions.

**Fix Summary:**
- `clearProcessHighlight` restores `orgPos` before rerunning the layout when preset coordinates are in play.

---

### 5. **Edge Metadata Lost** ✅
**File:** `src/graph/data.ts`

**Problem:**  
`buildGraphEdge` overwrote incoming `label` and `type` fields.

**Fix Summary:**
- Preserve `edge.label`, `edge.type`, and `edge.process` if provided. *(Implemented in current branch.)*

---

### 6. **Empty Legislative Color** ✅
**File:** `src/graph/constants.ts`

**Problem:**  
`branchPalette.legislative` was `''`, producing invalid colors.

**Fix Summary:**
- Assigned a valid hex color (`#1f2937`).

---

### 7. **Potential Memory Leak** ✅
**File:** `src/graph/inputHandler.ts`

**Problem:**  
`attach()` registers event handlers repeatedly if invoked more than once.

**Fix Summary:**
- `attach()` now calls `detach()` and `detach()` nulls bound handlers, preventing duplicate registrations.

---

## 💅 Nitpicks & Minor Suggestions

| File | Line(s) | Summary |
|------|----------|---------|
| `AGENTSv2.md` | 3, 171, 272 | Use headings instead of emphasis, add language tags to fenced code blocks |
| `data/city/subgraphs/departments.json` | 4 | Consider “mayor” as entry node or clarify why “departments” used |
| `src/components/ControlsPanel.tsx` | 140-155 | Extract active process lookup to variable or memoized expression |
| `src/graph/styles.ts` | 87-100 | Consolidate duplicate `.dimmed` opacity rules |
| `src/components/DetailsSidebar.tsx` | 51 | Split long `className` strings for readability |
| `src/graph/utils/logging.ts` | 6 | Make `DEFAULT_WATCH_IDS` configurable or documented *(addressed via `setDefaultWatchIds` helper)* |

---

## 🧪 LGTM Highlights
Most files received positive validation:
- **Data completeness:** city/state/federal edge references now resolve against their structures.
- **TypeScript hygiene:** type definitions, generics, and ambient declarations clean.
- **Styling:** Cytoscape style definitions well-organized and follow interaction states.
- **React Components:** follow modern React 19 conventions (hooks, accessibility, ARIA, async event safety).

---

## 🤖 Recommended Codex Tasks

All previously recommended tasks (ID alignment, store memoisation, preset layout restore, metadata retention, colour fixes, and handler cleanup) have been addressed in this pass.

---

## 🧭 Next Steps
1. Run data validation scripts to confirm no lingering ID mismatches.  
2. Verify UI interactions (scope focus buttons, subgraphs, process resets) across all combined datasets.  
3. Re-run `codex test` or CodeRabbit unit tests for regression coverage.  
4. Address remaining nitpicks (documentation, style consolidation) as time allows.

---

_Compiled by GPT-5 for Codex IDE ingestion_
