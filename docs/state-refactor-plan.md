# State Management Refactor Plan

## Goal

Simplify state management by removing fake abstractions and implementing a clean architecture:

**Target Architecture:**
```
Input Handler → Controller (only thing touching cytoscape) → setState → App (renderer)
```

## Architecture Before

```
Event → Orchestrator → ActionHandlers → setState
                    ↓
             SubviewController (returns state changes)
                    ↓
        useVisualizationState (reducer + wrappers)
```

## Architecture After

```
Event → InputHandler → Controller (cy operations + setState) → App (render)
```

## Key Benefits

1. ✅ ONE place for state: `useState` in App.tsx
2. ✅ ONE way to update state: `setState`
3. ✅ ONE controller for ALL cytoscape operations
4. ✅ Clear separation: InputHandler (events) → Controller (logic) → App (render)
5. ✅ No fake abstractions: every layer has a clear, distinct purpose

---

## Phase 1: Create Unified Controller

**Goal**: Merge all graph operations into a single Controller that's the ONLY thing touching cytoscape.

**Create: `src/graph/controller.ts`**

```typescript
// ABOUTME: Unified controller for ALL cytoscape graph operations
// ABOUTME: Only place that directly mutates cytoscape instance

import type { Core } from 'cytoscape';
import type { SubviewDefinition } from '../data/types';
import type { GovernmentScope } from '../data/datasets';

export type VisualizationState = {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  activeSubviewId: string | null;
  activeScope: GovernmentScope | null;
  controlsOpen: boolean;
  sidebarHover: boolean;
};

export type SetState = (updater: (prev: VisualizationState) => VisualizationState) => void;

export type Controller = {
  // Subview operations
  activateSubview: (subviewId: string) => Promise<void>;
  deactivateAll: () => Promise<void>;

  // Node/Edge selection
  selectNode: (nodeId: string) => void;
  selectEdge: (edgeId: string) => void;
  clearSelections: () => void;

  // Scope operations
  handleScopeChange: (scope: GovernmentScope) => Promise<void>;

  // Focus operations
  focusNodes: (nodeIds: string[]) => Promise<void>;
  clearNodeFocus: () => void;
};

export type ControllerConfig = {
  cy: Core;
  setState: SetState;
  subviewByAnchorId: Map<string, SubviewDefinition>;
  subviewById: Map<string, SubviewDefinition>;
  scopeNodeIds: Record<GovernmentScope, string[]>;
};

export function createController(config: ControllerConfig): Controller {
  // Implementation details in Phase 1
}
```

---

## Phase 2: Create InputHandler

**Goal**: Simple event translation layer that wires cytoscape events to controller calls.

**Create: `src/graph/inputHandler.ts`**

```typescript
// ABOUTME: Translates DOM and cytoscape events to controller actions
// ABOUTME: Simple event wiring layer with no business logic

import type { Core } from 'cytoscape';
import type { Controller } from './controller';
import type { SubviewDefinition } from '../data/types';

export type InputHandlerConfig = {
  cy: Core;
  controller: Controller;
  subviewByAnchorId: Map<string, SubviewDefinition>;
};

export function setupInputHandler(config: InputHandlerConfig): void {
  // Wire up cytoscape events
}
```

---

## Phase 3: Move State to App.tsx

**Goal**: Single useState in App, no custom hook.

**Update: `src/App.tsx`**

Replace `useVisualizationState` with:

```typescript
import { useState, useCallback } from 'react';
import type { VisualizationState } from './graph/controller';

const [state, setState] = useState<VisualizationState>({
  selectedNodeId: null,
  selectedEdgeId: null,
  activeSubviewId: null,
  activeScope: null,
  controlsOpen: true,
  sidebarHover: false,
});

// Simple derived values (Map.get lookups)
const activeNode = selectedNodeId ? nodesById.get(selectedNodeId) ?? null : null;
// ... etc
```

---

## Phase 4: Delete Orchestrator, Wire InputHandler

**Goal**: Remove orchestrator.ts, set up InputHandler directly in GraphCanvas.

**Update: `src/components/GraphCanvas.tsx`**

```typescript
import { createController } from '../graph/controller';
import { setupInputHandler } from '../graph/inputHandler';

// Inside useEffect:
const cy = cytoscape(cytoscapeConfig);
const controller = createController({ cy, setState, ... });
setupInputHandler({ cy, controller, ... });
```

---

## Phase 5: Delete Files

**Files to delete:**
1. `src/state/useVisualizationState.ts` - replaced by useState in App
2. `src/graph/orchestrator.ts` - logic moved to GraphCanvas + InputHandler
3. `src/graph/actionHandlers.ts` - replaced by InputHandler
4. `src/graph/subviewController.ts` - merged into unified Controller

---

## Phase 6: Update Component Props

**Update: `src/components/ControlsPanel.tsx`**

Change from `handlers: GraphActionHandlers` to `controller: Controller`

**Update: `src/App.tsx`**

Pass `controller={runtime?.controller ?? null}` to ControlsPanel

---

## Phase 7: Update Types

**Update or delete: `src/graph/runtimeTypes.ts`**

Simplified to just:
```typescript
export type GraphRuntime = {
  cy: Core;
  controller: Controller;
  destroy: () => void;
};
```
