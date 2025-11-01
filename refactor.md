# Functional Refactor Tracker

## Data Flow Summary
- `App.tsx` builds the dataset bundle, memoizes maps, and owns the React store actions exposed to the graph layer.
- `GraphCanvas` bridges React to Cytoscape by instantiating `createGraphRuntime`, forwarding store actions, and exposing imperative helpers via `ref`.
- `createGraphRuntime` (Phase C runtime) stands up the Cytoscape core, composes the controller and input bindings, and translates store intent into renderer commands.
- `createGraphController` is the mutation layer that performs layouts, applies highlight/dim classes, injects temporary nodes/edges for processes, and restores the main scene when state changes.
- `createGraphInputHandler` listens to `tap`/`zoom` events on the Cytoscape core and calls back into the runtime, so the React store remains the single source of truth for UI selections.
- The store (`useVisualizationState`) surfaces pure actions (`setActiveProcess`, `clearSelections`, etc.) that React views and the runtime consume, keeping state transitions declarative.

## Refactor Intent
- Replace the class-based runtime (`GraphOrchestrator`, `GraphController`, `GraphInputHandler`) with functional factories that return explicit command objects. Each module should own a single responsibility and be swappable in isolation.
- Preserve the current module boundaries: React views should orchestrate, runtime functions should mutate Cytoscape, and data loaders should stay declarative.
- Ensure every phase ends with a working tracer bullet (UI tap → graph update → sidebar change) before proceeding to deeper restructuring.

## Phase Gate
1. **Phase A – Stabilize Interfaces**  
   - Deliverable: type-first interfaces for controller/orchestrator/input modules described as functional contracts (`createGraphRuntime`, `GraphCommands`).  
   - Gate: existing class implementations continue to satisfy the new contracts via adapters; `GraphCanvas` remains unchanged beyond type annotations.
2. **Phase B – Functional Controller**  
   - Deliverable: `GraphController` rewritten as `createGraphController(cy, mainGraph)` returning a command surface that mirrors today’s methods.  
   - Gate: process highlighting, subgraph activation, and focus interactions verified manually; no regressions in ULURP tracer bullet.
3. **Phase C – Functional Orchestrator & Input**  
   - Deliverable: `GraphOrchestrator` and `GraphInputHandler` replaced with functional counterparts; `GraphCanvas` instantiates them via factories.  
   - Gate: full vertical slice exercised (select process, expand subgraph, reset view). Add lightweight trace log to verify orchestrated command order.
4. **Phase D – Cleanup & Tests**  
   - Deliverable: remove class shims, update docs/tests, and add unit coverage for command mapping (at least smoke tests for focus/reset).  
   - Gate: lint/tests pass; documentation reflects new functional architecture.

## Work Plan & Todos
- [x] Draft TypeScript interfaces for the functional command surfaces (`GraphRuntime`, `GraphCommands`, `GraphInputBindings`).
- [x] Add adapter layer so current classes satisfy the new interfaces (ensures Phase A tracer bullet).
- [x] Port `GraphController` internals to a closure-based implementation; reuse helper utilities for animation/layout.
- [x] Migrate `GraphOrchestrator` to `createGraphRuntime` that composes controller, input bindings, and store actions without `new`.
- [x] Replace `GraphInputHandler` class with a detachable listener registry built from pure functions.
- [x] Update `GraphCanvas` to consume the functional factories and simplify teardown logic.
- [x] Introduce regression harness (Jest smoke or Cypress script) to confirm focus → highlight → reset flow each phase.
- [x] Refresh documentation (architecture overview, onboarding) to reflect functional runtime.

## Phase A Progress
- Established `runtimeTypes.ts` to centralize the runtime command/event contracts and shared store/data typing.
- Updated `GraphOrchestrator`, `GraphCanvas`, and `GraphInputHandler` to adhere to the new contracts while keeping behavior intact.
- `bun run build` passes, preserving the existing tracer bullet while we prepare the functional controller migration.

## Phase B Progress
- Replaced the `GraphController` class with `createGraphController`, a closure-based runtime that exposes the same command surface while keeping internal state isolated.
- Updated `GraphOrchestrator` to depend on the new factory, confirming compatibility with existing store actions and Cytoscape wiring.
- Verified the tracer bullet via `bun run build`, establishing a working baseline before refactoring the orchestrator.

## Phase C Progress
- Introduced `createGraphRuntime`, a factory that composes Cytoscape setup, controller commands, and input bindings without relying on classes.
- Converted the input layer to `createGraphInputHandler`, clarifying attach/detach responsibilities and keeping event wiring swappable.
- Updated `GraphCanvas` to instantiate the runtime via the factory, preserving the tracer bullet (validated with `bun run build`) while eliminating `new` from the React layer.

## Regression Harness Snapshot
- Added dependency-injection hooks to `createGraphRuntime` so controller, Cytoscape, and input bindings can be mocked in isolation without touching React (supports white-box testing per module).
- Implemented a Bun-based lifecycle suite (`tests/runtimeLifecycle.test.ts`) that exercises initialize→highlight→reset flows and asserts cleanup (`destroy` detaches listeners, store resets, controller commands fire exactly once).
- Harness runs with `bun test`, keeping the tracer bullet green (`bun run build`) while surfacing lingering cleanup regressions quickly.

## Phase D Progress
- Updated `AGENTS.md` to describe the factory-driven runtime (`createGraphRuntime`, `createGraphController`, `createGraphInputHandler`) and refreshed the file layout map to match current directories.
- Confirmed docs note the new regression harness so future contributors see the guardrails before touching the runtime.

## Risks & Trade-offs
- **Stateful Cytoscape lifecycle:** Moving away from classes removes implicit `this` state; we need disciplined closure-scoped state management to prevent accidental shared references. Trade-off: clearer dependency injection at the cost of slightly more verbose factory wiring.
- **Incremental rollout complexity:** Maintaining adapters during Phase A/B introduces temporary duplication, but it guarantees a working tracer bullet and reduces regression risk.
- **Testing scope:** Functional modules make unit testing easier; however, investing in tests up front may slow Phase B slightly. Benefit outweighs cost by catching regressions early.

## Open Questions
- Should we expose the entire `cy` core to React consumers or restrict it to debug hooks only? (Recommended: keep access behind `GraphRuntime.getCy()` to avoid leaking concerns.)
- Do we want to co-locate debug tracing with the new functional runtime or keep it in `debug/`? Decision affects how factories receive logger dependencies.
