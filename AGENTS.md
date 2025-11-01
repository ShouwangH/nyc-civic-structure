# Codex Prompt — Architecture Revision Directive

Codex, your task is to **revise or implement code and documentation only insofar as it hardens and simplifies the architecture** of the NYC Civics Visualization project. The priority is to **preserve separation of concerns** while expanding features requested by the client. Our current trajectory has led to complex, interdependent logic blocks that are increasingly hard to debug and maintain — this must be reversed.

Your guiding principle: **extensibility and modularity are paramount.** Clear module boundaries, single responsibility per layer, and clean orchestration matter more than feature count. Every change should move the system toward easier reasoning, safer iteration, and clearer ownership of data flow.

---

## Mission

When you revise or implement code:

* Ask first: *Does this change reduce coupling and improve testability?*
* If not, stop and propose a smaller or clearer boundary.
* Prefer **explicit orchestration + declarative state transitions** over scattered side effects.
* Every module (input, store, orchestrator, renderer, view) must remain swappable and debuggable in isolation.

---

## Hard Rules (cannot be ignored)

**Rule 1 — Tracer Bullet First**
Every phase must end with a working, demonstrable vertical slice that proves functionality from UI to graph.

**Rule 5 — Supervision Contract**
Always describe trade-offs for performance or design decisions. Ask before adding dependencies or changing architectural patterns.

**Rule 8 — Code Style Discipline**
Functions must be short and self-documenting. Comments explain *why*, not *what*. Naming must read like the civic diagram (e.g., `highlightProcess`, `dimUnrelatedNodes`).

---

## Flexible Rules (bendable)

All other rules from the previous agents.md may be adapted pragmatically when necessary to achieve architectural simplicity or feature extensibility.

---

## Success Criteria

You are successful when:

* The architecture remains understandable by reading the orchestrator, store, and renderer in isolation.
* Debugging timing or state issues becomes straightforward.
* New client requests (like process expansion or rearrangement) can be added by extending existing modules, not rewriting them.
* The codebase naturally expresses its own structure — data, flow, and UI are distinct yet coherent.

End of directive.


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

  * Hook: `useVisualizationState` (React reducer) persists UI + graph state:

    * `controlsOpen: boolean`
    * `activeScope: 'city' | 'state' | 'federal'`
    * `selectedNodeId: string | null`
    * `selectedEdgeId: string | null`
    * `activeProcessId: string | null`
    * `activeSubgraphId: string | null`
    * `isSidebarHover: boolean`
  * **Actions** (pure intent) exposed to the rest of the app: `setActiveScope`, `setSelectedNode`, `setSelectedEdge`, `setActiveProcess`, `setActiveSubgraph`, `setSidebarHover`, `toggleControlsOpen`, `clearSelections`.
  * Derived view/calculations (e.g., `selectionActive`) remain in `App` for now; future evolution can migrate them into memoized selectors if needed.

* **Orchestrator**

  * `createGraphRuntime` composes the Cytoscape lifecycle for the active dataset.
  * Responsibilities:
    * Instantiates the Cytoscape core (allowing dependency injection in tests) and wires `createGraphController`.
    * Attaches an input binding produced by `createGraphInputHandler` to translate raw `tap`/`zoom` events into store actions.
    * Delegates to the controller for process highlighting and subgraph activation, mirroring results back into the store (`setActiveProcess`, `setActiveSubgraph`, `clearSelections`, etc.).
    * Exposes the command surface (`highlightProcess`, `activateSubgraph`, `restoreMainView`, `clearProcessHighlight`) consumed by React through `GraphCanvas`.

* **Renderer**

  * `GraphController` (unchanged scope):
    * Runs layouts (`layout.run()`), captures node positions, applies Cytoscape classes for highlight/dim.
    * Handles process-specific temporary nodes/edges (with animations currently disabled for debugging).
    * Restores the main view after subgraph/process transitions.

* **Input Handling**

  * `createGraphInputHandler` listens to core events (`tap` on nodes/edges/background, `zoom`) and forwards intent to the runtime, keeping raw Cytoscape logic isolated and detachable.

* **View Layer**

  * `GraphCanvas` instantiates the orchestrator, exposes its imperative API to React, and renders the Cytoscape container.
  * `ControlsPanel` (left) and `DetailsSidebar` (right) consume store state to render UI; they do not touch Cytoscape directly.
  * `App` coordinates dataset selection, memoizes node/edge maps, and bridges store actions to the canvas.

### 3.2 Event Flow

User action → **InputHandler** → **Orchestrator** → **Store actions** (mutate selection/process state) → **Renderer** updates (classes/layout) → **React view** re-renders → optional debug trace.

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
  App.tsx
  components/
    ControlsPanel.tsx
    DetailsSidebar.tsx
    GraphCanvas.tsx
  data/
    datasets.ts
    unifiedDataset.ts
    city/{structure.json,edges.json,processes.json,subgraphs/*}
    state/*
    federal/*
  graph/
    controller.ts                # createGraphController
    orchestrator.ts              # createGraphRuntime
    inputHandler.ts              # createGraphInputHandler
    runtimeTypes.ts
    data.ts
    subgraphs.ts
    processUtils.ts
    constants.ts
    types.ts
  state/
    useVisualizationState.ts
  styles/
    fonts.css
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

* `App.tsx` remains the tracer-bullet shell; keep dataset loading and store wiring thin.
* `createGraphController` centralizes Cytoscape mutations; all graph changes flow through runtime commands.
* `createGraphInputHandler` owns **all** Cytoscape event bindings and stays detach-friendly.
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

> Preserved for context; describes the pre-refactor class-based runtime (`GraphOrchestrator`, `GraphInputHandler`, etc.).

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

# architecture snapshot

- **state store**: `useVisualizationState` centralizes UI + graph state (scope, selections, process/subgraph flags) and exposes actions (`setSelectedNode`, `clearSelections`, `toggleControlsOpen`, etc.).
- **graph orchestrator**: `GraphOrchestrator` owns Cytoscape lifecycle, wiring the `GraphController` renderer, attaching a `GraphInputHandler`, and translating store actions into layout/process/subgraph transitions.
- **renderer logic**: `GraphController` remains focused on Cytoscape layouts, animations, process highlighting, and subgraph activation.
- **input handling**: `GraphInputHandler` listens to Cytoscape events and delegates interactions to the orchestrator.
- **view layer**: `GraphCanvas` instantiates the orchestrator and bridges the graph API into React; `ControlsPanel` and `DetailsSidebar` consume store state for UI.
- **data loop**: `App` pulls datasets via `buildMainGraph`, `buildSubgraphGraph`, memoizes node/edge maps, and passes them—along with store actions—to the canvas orchestrator so all graph mutations funnel through the centralized store.
- **current considerations**:
  - Process highlights temporarily exit any active subgraph; orchestrator handles restore after clearing.
  - Animations currently disabled in controller for easier debugging; re-enable once layout issues settle.
  - Manual testing only (`bun run dev`); no automated regression coverage yet.
- **data sources**:
  - City data: `data/city/structure.json`, `data/city/edges.json`, `data/city/processes.json`, subgraph files under `data/city/subgraphs/`.
  - State data: parallel files in `data/state/`.
  - Federal data: parallel files in `data/federal/`.
  - `src/data/datasets.ts` normalizes each scope into the structure/edges/process/subgraph bundle used by `App`.
- **next focus**:
  1. Re-enable `GraphController` animations once concentric layout is stable, validating both manual and automatic runs.
  2. Expand orchestrator to support sequential process animations (storytelling polish, phase 4).
  3. Introduce lightweight regression checks (e.g., Cypress screenshot diff or Jest smoke) to catch layout regressions before deployment.
  4. Add budget/agency hover data enrichment once static JSON includes financial fields.

# NYC Civics Visualization — Agents.md

## objective

build a lightweight, educational visualization of how new york city government functions —
focused on branches, relationships, and core civic processes (legislative, budget, and ulurp).
the app should feel clear, intuitive, and pleasant to use for students, without overengineering
or unnecessary framework complexity. interactivity should always serve understanding.

the final output is a zoomable and clickable map of nyc governance, with process toggles
and factual context.

---

## tech stack

**frontend:** react + vite + tailwind  
**visualization:** cytoscape.js (phase 1-3), optionally reaflow (phase 4 swap-in)  
**language:** typescript  
**state:** react context or local component state only  
**data:** static json (`data/government.json`)  
**hosting:** vercel static build  

no backend, no analytics, no tracking, no persistent auth. everything is static and client-side.

---

## ruleset

**1. tracer bullet first.**  
each phase must end with a working demo that proves the core interaction path.
build thinly, prove vertically.

**2. minimalism is policy.**  
no abstractions, no unnecessary libraries, no clever state management.  
clear, legible code > sophisticated patterns.

**3. declarative data.**  
all civic entities live in `data/government.json`.  
never hardcode nodes or edges inside components. treat the dataset as source of truth.

**4. educational clarity.**  
every animation, color, or layout must clarify function.  
if it looks cool but teaches nothing, remove it.

**5. supervision contract.**  
always describe trade-offs if a design or performance choice arises.  
ask before switching libraries or adding dependencies.

**6. interaction hierarchy.**  
zoom → pan → click node → show sidebar factoid → toggle process flow.  
keep the interaction vocabulary consistent and minimal.

**7. color logic**  
legislative: blue  
budget: green  
ulurp: orange  
non-active elements fade to 30% opacity.

**8. code style.**  
short, self-documenting functions. comments explain *why*, not *what*.  
naming should read like a civic diagram (e.g., `highlightProcess`, `dimUnrelatedNodes`).

**9. deploy early.**  
each successful phase should be deployable on vercel.  
small visible progress beats unfinished architecture.

**10. design for extension, not prediction.**  
future integrations (open data api)are optional.  
the visualization must stand alone and teach well without them.

---

## phases

**phase 0 — scaffold**  
create vite + react project, install tailwind and cytoscape.js.  
add `data/government.json` from diagram draft.  
render placeholder container and confirm build + dev loop works.

**phase 1 — graph rendering**  
load json nodes and edges into cytoscape.  
apply simple hierarchical layout (nyc charter → branches → departments → community boards).  
enable zoom and pan.  
style nodes by branch color family (executive, legislative, community, etc.).  
verify basic interactivity (hover tooltip or console log on click).

**phase 2 — process highlighting**  
implement `highlightProcess(processName)` that dims unrelated nodes and recolors edges.  
add top toolbar with toggle buttons: legislative / budget / ulurp / reset.  
verify transitions feel instant and clear.  
add basic tooltip with node factoid.

**phase 3 — sidebar + ui polish**  
clicking a node opens a right-side panel showing its description, branch, and process roles.   
ensure responsive layout and smooth transitions.  
remove temporary console logs.

**phase 4 — refinement and storytelling polish**  
adjust layout spacing, labels, and color legend.  
consider swapping cytoscape for reaflow if more precise layout or react-native nodes are needed.  
add optional lightweight animation for process flow.  
prepare final vercel deployment and short project summary.

---

## definition of done

- app loads from `data/government.json`  
- zoom and pan work smoothly  
- nodes clickable, sidebar opens  
- toggling a process clearly shows its flow and dims others  
- design feels coherent and legible  
- deploys cleanly to vercel as static build  

---

## stretch goals

- show budget values or agency spending on hover  
- animate process steps sequentially  
- add historical toggle (compare past vs current charter structures)

---

## closing note

clarity, not cleverness.  
teach the structure before embellishing it.  
every element should make the nyc government easier to understand.  
progress in small, visible steps.  
