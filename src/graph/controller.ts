// ABOUTME: Main graph controller module
// ABOUTME: Composes specialized feature controllers into unified API
import type { Core } from 'cytoscape';
import type { GraphConfig } from './types';
import { captureInitialPositions, createMainLayoutRunner } from './layout';
import { createSubgraphController } from './subgraph-controller';
import { createNodeFocusController } from './node-focus-controller';

/**
 * Public API for graph control operations
 * All methods are safe to call before initialization (no-op if controller is null)
 */
export type GraphController = {
  captureInitialPositions: () => void;
  focusNodes: (nodeIds: string[]) => Promise<void>;
  clearNodeFocus: () => void;
  activateSubgraph: (subgraph: GraphConfig, meta: { id: string; entryNodeId: string }) => Promise<void>;
  restoreMainView: () => Promise<void>;
  isSubgraphActive: (id?: string) => boolean;
  getActiveSubgraphId: () => string | null;
};

/**
 * Creates the main graph controller by composing specialized feature controllers
 *
 * Architecture:
 * - Layout utilities (layout.ts) - Pure functions for layout configuration and execution
 * - Animation utilities (animation.ts) - Animation orchestration
 * - Style utilities (styles-application.ts) - CSS class management
 * - Feature controllers:
 *   - NodeFocusController - Node focus animations and highlights
 *   - SubgraphController - Subgraph activation and restoration
 *
 * Each feature controller encapsulates its own state (active IDs, transition flags)
 * and provides a clean API. The main controller delegates to appropriate feature controllers.
 */
const createGraphController = (cy: Core, mainGraph: GraphConfig): GraphController => {
  // Shared layout runner used by feature controllers
  const runMainGraphLayout = createMainLayoutRunner(cy, mainGraph);

  // Create specialized feature controllers
  const nodeFocusController = createNodeFocusController({ cy });
  const subgraphController = createSubgraphController({ cy, runMainGraphLayout });

  // Compose public API by delegating to feature controllers
  return {
    // Initial position capture (called once after first layout)
    captureInitialPositions: () => captureInitialPositions(cy),

    // Node focus operations
    focusNodes: nodeFocusController.focus,
    clearNodeFocus: nodeFocusController.clear,

    // Subgraph operations
    activateSubgraph: subgraphController.activate,
    restoreMainView: subgraphController.restore,
    isSubgraphActive: subgraphController.isActive,
    getActiveSubgraphId: subgraphController.getActiveId,
  };
};

export { createGraphController };
