// ABOUTME: Unified controller for ALL cytoscape graph operations
// ABOUTME: Only place that directly mutates cytoscape instance and calls setState

import type { Core } from 'cytoscape';
import type { SubviewDefinition } from '../data/types';
import type { GraphNodeInfo, GraphEdgeInfo } from '../visualization/cytoscape/types';
import type { GovernmentScope } from '../data/datasets';
import type { GraphAction } from './actions';

// Import state management
import type { VisualizationState, SetState } from './state-manager';
import { transitionVisualizationState, applyScopeStyling } from './state-manager';

// Import subview operations
import type { SubviewOperationsContext } from '../visualization/cytoscape/subview-operations';
import { activateSubview, deactivateSubview } from '../visualization/cytoscape/subview-operations';

// Import focus operations
import {
  focusNodes as focusNodesOp,
  clearNodeFocus as clearNodeFocusOp,
  captureInitialPositions as captureInitialPositionsOp,
} from '../visualization/cytoscape/focus-operations';

// Re-export types for consumers
export type { VisualizationState, SetState } from './state-manager';

export type Controller = {
  // Central dispatch - all user interactions go through this
  dispatch: (action: GraphAction) => Promise<void>;

  // Utility methods (not user actions)
  focusNodes: (nodeIds: string[]) => Promise<void>;
  clearNodeFocus: () => void;
  captureInitialPositions: () => void;
};

export type ControllerConfig = {
  cy: Core;
  setState: SetState;
  getState: () => VisualizationState;
  subviewByAnchorId: Map<string, SubviewDefinition>;
  subviewById: Map<string, SubviewDefinition>;
  scopeNodeIds: Record<GovernmentScope, string[]>;
  nodeScopeIndex: Map<string, GovernmentScope>;
  nodeInfosById: Map<string, GraphNodeInfo>;
  edgeInfosById: Map<string, GraphEdgeInfo>;
};

export function createController(config: ControllerConfig): Controller {
  const {
    cy,
    setState,
    getState,
    subviewById,
    scopeNodeIds,
    nodeScopeIndex,
    nodeInfosById,
  } = config;

  // Subview operation context (shared mutable state)
  const subviewContext: SubviewOperationsContext = {
    activeSubview: null,
    transitionInProgress: false,
  };

  // Config for subview operations
  const subviewConfig = {
    cy,
    setState,
    getState,
    subviewById,
    scopeNodeIds,
    nodeInfosById,
  };

  // ============================================================================
  // NODE/EDGE SELECTION (Internal - called by dispatch)
  // ============================================================================

  const selectNode = (nodeId: string): void => {
    // Cytoscape operations
    cy.elements().removeClass('highlighted');
    const node = cy.getElementById(nodeId);
    if (!node.empty()) {
      node.addClass('highlighted');
    }

    // Determine the scope of the clicked node
    const nodeScope = nodeScopeIndex.get(nodeId);
    const currentState = getState();

    // Set activeScope to the node's scope if not already set or different
    const shouldUpdateScope = nodeScope && currentState.activeScope !== nodeScope;

    if (shouldUpdateScope) {
      applyScopeStyling(cy, nodeScope, scopeNodeIds);
    }

    // Update React state (transition function handles mutual exclusivity and sidebar)
    // Set activeTab to 'details' when a node is selected
    transitionVisualizationState(setState, {
      selectedNodeId: nodeId,
      activeTab: 'details',
      ...(shouldUpdateScope ? { activeScope: nodeScope } : {}),
    });
  };

  const selectEdge = (edgeId: string): void => {
    // Cytoscape operations
    cy.elements().removeClass('highlighted');
    const edge = cy.getElementById(edgeId);
    if (!edge.empty()) {
      edge.addClass('highlighted');
    }

    // Update React state (transition function handles mutual exclusivity and sidebar)
    transitionVisualizationState(setState, {
      selectedEdgeId: edgeId,
    });
  };

  const clearSelections = (): void => {
    // Cytoscape operations
    cy.elements().removeClass('highlighted');

    // Update React state
    transitionVisualizationState(setState, {
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  };

  // ============================================================================
  // BACKGROUND CLICK (Internal - called by dispatch)
  // ============================================================================

  const handleBackgroundClick = async (): Promise<void> => {
    console.log('[Controller] handleBackgroundClick:', {
      transitionInProgress: subviewContext.transitionInProgress,
      activeSubviewId: subviewContext.activeSubview?.id,
    });

    // Guard: Don't allow background clicks during transitions
    if (subviewContext.transitionInProgress) {
      console.log('[Controller] handleBackgroundClick ABORT: transition in progress');
      return;
    }

    const currentState = getState();
    console.log('[Controller] handleBackgroundClick state:', {
      sankeyOverlay: !!currentState.sankeyOverlay,
      sunburstOverlay: !!currentState.sunburstOverlay,
      selectedNodeId: currentState.selectedNodeId,
      selectedEdgeId: currentState.selectedEdgeId,
      activeSubviewId: currentState.activeSubviewId,
      activeScope: currentState.activeScope,
      internalActiveSubview: subviewContext.activeSubview?.id,
    });

    // If there's an overlay open, close it (preserve node selection)
    if (currentState.sankeyOverlay || currentState.sunburstOverlay) {
      console.log('[Controller] handleBackgroundClick: closing overlay');
      await deactivateSubview(subviewConfig, subviewContext, focusNodes);
      return;
    }

    // If there's a selected node or edge, clear only selections (keep activeScope)
    if (currentState.selectedNodeId || currentState.selectedEdgeId) {
      console.log('[Controller] handleBackgroundClick: clearing selections');
      clearSelections();
      return;
    }

    // If there's an active subview, deactivate it (keep activeScope)
    // Check INTERNAL controller state, not React state (which may be stale due to async updates)
    if (subviewContext.activeSubview) {
      console.log('[Controller] handleBackgroundClick: deactivating subview (using internal state)');
      await deactivateSubview(subviewConfig, subviewContext, focusNodes);
      return;
    }

    // If there's an active scope but no selections/subview, clear the scope
    if (currentState.activeScope) {
      console.log('[Controller] handleBackgroundClick: clearing scope');
      clearNodeFocus();
      transitionVisualizationState(setState, {
        activeScope: null,
      });
    }
  };

  // ============================================================================
  // SCOPE OPERATIONS (Internal - called by dispatch)
  // ============================================================================

  const handleScopeChange = async (scope: GovernmentScope): Promise<void> => {
    // Deactivate any active subview first
    if (subviewContext.activeSubview) {
      await deactivateSubview(subviewConfig, subviewContext, focusNodes);
    }

    const nodeIds = scopeNodeIds[scope];
    if (!nodeIds || nodeIds.length === 0) {
      return;
    }

    // Apply scope styling and focus
    applyScopeStyling(cy, scope, scopeNodeIds);
    await focusNodes(nodeIds);

    // Update React state
    transitionVisualizationState(setState, {
      activeScope: scope,
      activeSubviewId: null,
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  };

  // ============================================================================
  // UTILITY OPERATIONS (Public API)
  // ============================================================================

  const focusNodes = async (nodeIds: string[]): Promise<void> => {
    await focusNodesOp(nodeIds, cy);
  };

  const clearNodeFocus = (): void => {
    clearNodeFocusOp(cy);
  };

  const captureInitialPositions = (): void => {
    captureInitialPositionsOp(cy);
  };

  // ============================================================================
  // CENTRAL DISPATCH (Public API)
  // ============================================================================

  /**
   * Central dispatch function - all user interactions route through here.
   */
  const dispatch = async (action: GraphAction): Promise<void> => {
    console.log('[Controller] Dispatch:', action.type, {
      transitionInProgress: subviewContext.transitionInProgress,
      activeSubviewId: subviewContext.activeSubview?.id,
      payload: 'payload' in action ? action.payload : undefined,
    });

    switch (action.type) {
      case 'NODE_CLICK': {
        const { nodeId } = action.payload;

        // Guard: Don't allow node clicks during transitions
        if (subviewContext.transitionInProgress) {
          return;
        }

        const currentState = getState();

        // If there's an active subview and we're clicking outside it, deactivate first
        if (currentState.activeSubviewId && subviewContext.activeSubview) {
          const isNodeInSubview = subviewContext.activeSubview.affectedNodeIds.has(nodeId);
          if (!isNodeInSubview) {
            // Clicking outside active subview - deactivate it first
            await deactivateSubview(subviewConfig, subviewContext, focusNodes);
            // Fall through to handle the click normally
          }
        }

        // Now handle the node click
        const subview = config.subviewByAnchorId.get(nodeId);

        if (subview) {
          // Node is a subview anchor
          const isActive = subviewContext.activeSubview?.id === subview.id;
          if (isActive) {
            // Re-clicking active subview - use hierarchical clearing
            await handleBackgroundClick();
          } else if (subview.renderTarget === 'overlay') {
            // Overlay subviews don't auto-activate on node click - just select the node
            // User must explicitly activate via ControlPanel
            selectNode(nodeId);
          } else {
            // Cytoscape subviews auto-activate on node click
            await activateSubview(subview.id, subviewConfig, subviewContext, focusNodes);
          }
        } else {
          // Regular node - select it
          selectNode(nodeId);
        }
        break;
      }

      case 'EDGE_CLICK': {
        // Guard: Don't allow edge clicks during transitions
        if (subviewContext.transitionInProgress) {
          return;
        }

        const { edgeId } = action.payload;
        selectEdge(edgeId);
        break;
      }

      case 'BACKGROUND_CLICK': {
        await handleBackgroundClick();
        break;
      }

      case 'NODE_HOVER': {
        const { nodeId } = action.payload;
        const node = cy.getElementById(nodeId);
        if (!node.empty()) {
          node.addClass('hovered');
        }
        break;
      }

      case 'NODE_UNHOVER': {
        cy.elements().removeClass('hovered');
        break;
      }

      case 'ACTIVATE_SUBVIEW': {
        const { subviewId } = action.payload;
        await activateSubview(subviewId, subviewConfig, subviewContext, focusNodes);
        break;
      }

      case 'DEACTIVATE_SUBVIEW': {
        await deactivateSubview(subviewConfig, subviewContext, focusNodes);
        break;
      }

      case 'CHANGE_SCOPE': {
        const { scope } = action.payload;
        await handleScopeChange(scope);
        break;
      }

      case 'CLEAR_SCOPE': {
        clearNodeFocus();
        transitionVisualizationState(setState, {
          activeScope: null,
        });
        break;
      }

      case 'CLEAR_SELECTIONS': {
        clearSelections();
        break;
      }

      case 'CHANGE_VIEW_MODE': {
        const { mode } = action.payload;
        transitionVisualizationState(setState, {
          viewMode: mode,
        });
        break;
      }

      case 'CHANGE_CONTROL_PANEL_TAB': {
        const { tab } = action.payload;
        transitionVisualizationState(setState, {
          activeTab: tab,
        });
        break;
      }

      default: {
        // Exhaustiveness check
        const _exhaustive: never = action;
        console.warn('Unknown action type:', _exhaustive);
      }
    }
  };

  return {
    dispatch,
    focusNodes,
    clearNodeFocus,
    captureInitialPositions,
  };
}
