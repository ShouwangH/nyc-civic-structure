# NYC Civics Visualization — agents.md (v2)

*Last updated: 2025-10-30*

## 0) Purpose & Scope

Build an educational, **interactive atlas of NYC government** that helps users learn structures (orgs, people, relationships) and **processes** (ULURP, Legislative, Budget) with clarity and speed. The UI supports:

* **Process focus mode** (e.g., ULURP) with left→right hierarchical layout.
* **Agency expansion** (explode the “City agencies/departments” block; click any agency to highlight related bodies/officials).
* **Context-aware rearrangement** (re-layout based on focused entity/process; hide unrelated nodes).
* **Left process menu** (toggleable) and **Right details sidebar** (process header + rich details).

The app is a React + Cytoscape client. Static JSON for now; optional data service later.

---

## 1) Product Pillars

1. **Pedagogical clarity**: animations/layouts must serve understanding.
2. **Speed-to-demo**: every phase ends with a working deployment.
3. **Observability**: timing/state changes are inspectable to kill race conditions.
4. **Extensibility**: new processes, scopes (city/state/federal), and views drop in without surgery.

---

## 2) Core User Stories

* **US1 – Focus a process**: As a learner, I can open the left menu, click **ULURP**, and the canvas re-lays out **left→right**, dims unrelated nodes, sets the right sidebar header to “ULURP,” and shows a clear step sequence.
* **US2 – Expand agencies**: As a learner, I click the “City agencies/departments” block to reveal all agencies. Clicking **City Planning Commission** highlights it and **reveals connections** to the Mayor and City Council.
* **US3 – Focus a node**: As a learner, I click **Mayor** and everything connected is highlighted; all else hides (with a small “Show all” hint).
* **US4 – Navigate scopes**: I can switch between **City / State / Federal** datasets; the UI preserves patterns and controls.
* **US5 – Learn from the sidebar**: The right panel always reflects the current focus (process or node) with titles, definitions, and linked steps.

---

## 3) High-Level Architecture

### 3.1 Layers

* **Data Layer**

  * Static JSON bundles per scope (City/State/Federal): `structure.json`, `edges.json`, `processes.json`, optional `subgraphs/*`.
  * Single, normalized loader: `src/data/datasets.ts` → `DatasetBundle`.

* **State Store** (single source of truth)

  * Hook: `useVisualizationState` (Zustand or Context + reducer). Holds:

    * `activeScope` ("city" | "state" | "federal")
    * `activeProcessId: string | null`
    * `focusNodeId: string | null`
    * `expandedNodeIds: Set<string>`
    * `visibleNodeIds: Set<string>` (derived)
    * `layoutMode: 'auto' | 'hier-lr' | 'concentric'`
    * `ui: { leftMenuOpen: boolean; rightPanelOpen: boolean }`
    * `debug: { animEnabled: boolean; trace: boolean }`
  * **Commands** (pure intent): `focusProcess(id)`, `clearProcess()`, `focusNode(id)`, `clearFocus()`, `expandNode(id)`, `collapseNode(id)`, `setLayout(mode)`, `toggleLeftMenu()`, `toggleRightPanel()`, `setSidebarHeader(str)`.
  * **Derived selectors** compute visibility and styling flags.

* **Orchestrator**

  * `GraphOrchestrator` subscribes to store **commands/events** and drives:

    * **Renderer** updates (nodes/edges visibility, classes).
    * **Layout** selection (`hier-lr` for process focus, `concentric` for overview).
    * **Subgraph** activation/restore.
    * **Sidebar** header sync (process vs node).
  * Emits structured **debug traces** for timing/ordering.

* **Renderer**

  * `GraphController` owns Cytoscape instance, styles, animations, and processes visual classes:

    * `applyVisibility(visibleNodeIds)`
    * `highlightProcess(processDef)`
    * `highlightNeighborhood(nodeId)`
    * `runLayout(mode)`
    * `animateSequence(steps)` (optional phase)

* **Input Handling**

  * `GraphInputHandler` wires Cytoscape events (`tap`, `select`, `zoom`) and dispatches **commands** to the store (never mutates Cy directly).

* **View Layer**

  * `GraphCanvas` instantiates orchestrator + graph controller; subscribes to store for render triggers.
  * `ProcessMenuLeft` (collapsible) lists all processes.
  * `DetailsSidebarRight` shows process/node context; header becomes **selected process** when active.

### 3.2 Event Flow

User action → **InputHandler** → **Store Command** → **Orchestrator reaction** → **Renderer** (class/visibility/layout) → **View** updates → **Trace log**.

---

## 4) Data Model (TypeScript sketches)

```ts
export type EntityType = 'agency' | 'department' | 'body' | 'official' | 'board' | 'commission' | 'role';

export interface NodeDef {
  id: string;
  name: string;
  entityType: EntityType;
  scope: 'city' | 'state' | 'federal';
  facts?: Record<string, string | number>;
}

export interface EdgeDef {
  id: string;
  source: string;
  target: string;
  relation: 'appoints' | 'reports_to' | 'member_of' | 'advises' | 'funds' | 'approves' | 'reviews' | string;
}

export interface ProcessStep {
  id: string;
  title: string;
  nodeIds: string[]; // participants for highlighting
  description?: string;
}

export interface ProcessDef {
  id: string; // 'ulurp' | 'budget' | 'legislation'
  title: string;
  color: string; // e.g., 'orange'
  steps: ProcessStep[];
  layout: 'hier-lr' | 'concentric' | 'grid';
}

export interface DatasetBundle {
  nodes: NodeDef[];
  edges: EdgeDef[];
  processes: Record<string, ProcessDef>;
  subgraphs?: Record<string, { nodes: string[]; edges: string[] }>; // e.g., agencies expansion
}
```

**Conventions**

* IDs are stable across scopes when conceptually identical; prefix scope when ambiguous (`city:mayor`).
* `relation` vocabulary is limited and documented.
* Processes own their **step → nodeIds** mapping (no renderer hardcoding).

---

## 5) Interaction & Layout Rules

* **Process focus** sets `activeProcessId` and `layoutMode='hier-lr'`.
* **Node focus** sets `focusNodeId` and hides non-neighbors (one hop by default, configurable).
* **Agency expansion** toggles membership subgraph; orchestrator updates visibility and re-runs layout.
* **Right sidebar header** = `activeProcess.title` when in process mode; otherwise active node name.
* **Left menu**: sticky, collapsible; keyboard accessible.
* **Colors**: legislation=blue, budget=green, ulurp=orange; dim non-active to 30%.
* **Animations**: guarded by `debug.animEnabled`; sequence animations only in phase 4+.

---

## 6) Debuggability & Observability

* `debug/trace.ts`: structured logs like `[{t, src:'orchestrator', evt:'focusProcess', payload}]`.
* `debug/positionLogger.ts`: snapshot node positions pre/post layout; diff unique positions.
* **Dev overlay** (hotkey `D`): shows current store state and last 20 trace events.
* **Regression checks**: Jest smoke + Cypress screenshot diffs on key scenes (overview, ULURP, focus Mayor, agencies expanded).

---

## 7) File Layout

```
src/
  app/
    AppShell.tsx
    GraphCanvas.tsx
    ProcessMenuLeft.tsx
    DetailsSidebarRight.tsx
  core/
    orchestrator/GraphOrchestrator.ts
    renderer/GraphController.ts
    input/GraphInputHandler.ts
    state/store.ts
    state/selectors.ts
  data/
    datasets.ts
    city/{structure.json,edges.json,processes.json,subgraphs/*}
    state/*
    federal/*
  debug/
    trace.ts
    positionLogger.ts
```

---

## 8) Phases & Milestones

**Phase 1 — Stabilize Overview (Now → Done when):**

* Concentric (or chosen) layout stable; animations off by default.
* Right sidebar renders for nodes; process buttons operate but without re-layout.
* Trace logs available; position logger callable.

**Phase 2 — Process Focus (ULURP first):**

* Left menu lists processes; clicking ULURP:

  * sets right header to ULURP,
  * re-layouts **left→right**,
  * highlights participating nodes/edges,
  * dims others.
* “Reset” returns to overview and original subgraph state.

**Phase 3 — Expansion & Node Focus:**

* Clicking “City agencies/departments” expands agencies.
* Clicking any agency focuses neighborhood (Mayor, Council) and hides non-neighbors.
* Layout adapts to focus; quick toggle to show all.

**Phase 4 — Storytelling & Sequences:**

* Optional step-by-step animation through process steps.
* Color legend, keyboard navigation, accessible menus.
* Add budget/financial fields to hovers.

**Phase 5 — Hardening:**

* Cypress screenshot diffs; smoke tests in CI.
* Performance pass (prune DOM thrash, cache selectors, memoize maps).
* Content pass on copy and glossary.

---

## 9) Definition of Done (project)

* Processes (ULURP, Legislative, Budget) each work in focus mode with LR layout.
* Agency expansion and node focus behave as described.
* Left/Right panels are predictable and accessible.
* Trace tooling exists; no animation race regressions.
* Deployed on Vercel; doc site includes “How to read this diagram.”

---

## 10) Refactor & Rename Plan

* `app.tsx` → `AppShell.tsx`.
* `GraphController` remains, but all Cy mutations flow from store/orchestrator.
* `GraphInputHandler` contains **all** Cy event bindings.
* Move debug helpers to `debug/*`.
* Introduce `commands.ts` (typed command names & payloads) to enforce orchestration boundaries.

---

## 11) Risks & Mitigations

* **Race conditions** between layout and visibility → **Mitigation**: single-thread updates: store commit → orchestrator batch → renderer; avoid interleaving.
* **Graph bloat** when expanding agencies → virtualize lists in sidebar; lazy-build visible elements only.
* **Scope complexity** (city/state/federal) → strict dataset contracts; one loader.

---

## 12) Stretch

* Save/share permalinks to focused views.
* Print/export to PDF of current focus.
* Lightweight server for search & incremental data updates.

---

## Appendix A — Command Catalog (examples)

```
focusProcess(id)
clearProcess()
focusNode(id)
clearFocus()
expandNode(id)
collapseNode(id)
setLayout('hier-lr' | 'concentric' | 'grid')
setSidebarHeader(title)
resetView()
```

---

## Appendix B — Historical Snapshot (verbatim)

### Architecture snapshot (previous)

* **state store**: `useVisualizationState` centralizes UI + graph state (scope, selections, process/subgraph flags) and exposes actions (`setSelectedNode`, `clearSelections`, `toggleControlsOpen`, etc.).
* **graph orchestrator**: `GraphOrchestrator` owns Cytoscape lifecycle, wiring the `GraphController` renderer, attaching a `GraphInputHandler`, and translating store actions into layout/process/subgraph transitions.
* **renderer logic**: `GraphController` remains focused on Cytoscape layouts, animations, process highlighting, and subgraph activation.
* **input handling**: `GraphInputHandler` listens to Cytoscape events and delegates interactions to the orchestrator.
* **view layer**: `GraphCanvas` instantiates the orchestrator and bridges the graph API into React; `ControlsPanel` and `DetailsSidebar` consume store state for UI.
* **data loop**: `App` pulls datasets via `buildMainGraph`, `buildSubgraphGraph`, memoizes node/edge maps, and passes them—along with store actions—to the canvas orchestrator so all graph mutations funnel through the centralized store.
* **current considerations**:

  * Process highlights temporarily exit any active subgraph; orchestrator handles restore after clearing.
  * Animations currently disabled in controller for easier debugging; re-enable once layout issues settle.
  * Manual testing only (`bun run dev`); no automated regression coverage yet.
* **data sources**:

  * City data: `data/city/structure.json`, `data/city/edges.json`, `data/city/processes.json`, subgraph files under `data/city/subgraphs/`.
  * State data: parallel files in `data/state/`.
  * Federal data: parallel files in `data/federal/`.
  * `src/data/datasets.ts` normalizes each scope into the structure/edges/process/subgraph bundle used by `App`.
* **next focus**:

  1. Re-enable `GraphController` animations once concentric layout is stable, validating both manual and automatic runs.
  2. Expand orchestrator to support sequential process animations (storytelling polish, phase 4).
  3. Introduce lightweight regression checks (e.g., Cypress screenshot diff or Jest smoke) to catch layout regressions before deployment.
  4. Add budget/agency hover data enrichment once static JSON includes financial fields.

### NYC Civics Visualization — Agents.md (previous)

[The previous ruleset and phases you shared live here as the historical record for context.]
