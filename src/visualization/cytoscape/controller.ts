// ABOUTME: Unified controller for ALL cytoscape graph operations
// ABOUTME: Only place that directly mutates cytoscape instance and calls setState

import type { Core } from 'cytoscape';
import type { SubviewDefinition, SubviewType } from '../../data/types';
import type { GraphNodeInfo, GraphEdgeInfo } from './types';
import type { MainLayoutOptions} from './layout';
import {
  copyPosition,
  getViewportMetrics,
} from './layout';
import { ANIMATION_DURATION, ANIMATION_EASING } from './animation';
import {
  applyProcessHighlightClasses,
  resetHighlightClasses,
  resetProcessClasses,
  applyStructuralSubviewClasses,
} from './styles-application';
import { createStructuralLayoutOptions } from './layouts';
import type { GovernmentScope } from '../../data/datasets';
import type { GraphAction } from './actions';

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
  runMainGraphLayout: (options?: MainLayoutOptions) => Promise<void>;
};

type ActiveSubviewState = {
  id: string;
  type: SubviewType;
  addedNodeIds: Set<string>;
  addedEdgeIds: Set<string>;
  affectedNodeIds: Set<string>;
  affectedEdgeIds: Set<string>;
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
    runMainGraphLayout,
  } = config;

  let activeSubview: ActiveSubviewState | null = null;
  let transitionInProgress = false;

  /**
   * Applies scope styling to the graph - dims nodes/edges outside the scope.
   */
  const applyScopeStyling = (scope: GovernmentScope): void => {
    const nodeIds = scopeNodeIds[scope];
    if (!nodeIds || nodeIds.length === 0) {
      return;
    }

    const scopeNodeSet = new Set(nodeIds);
    cy.batch(() => {
      cy.elements().removeClass('dimmed faded highlighted');

      cy.nodes().forEach((node) => {
        if (!scopeNodeSet.has(node.id())) {
          node.addClass('dimmed');
        }
      });

      cy.edges().forEach((edge) => {
        const source = edge.source().id();
        const target = edge.target().id();
        if (!scopeNodeSet.has(source) || !scopeNodeSet.has(target)) {
          edge.addClass('faded');
        }
      });
    });
  };

  /**
   * Central state transition function with business rules enforcement.
   * Single source of truth for how VisualizationState changes are applied.
   */
  const transitionVisualizationState = (changes: Partial<VisualizationState>) => {
    setState((prev) => {
      const next = { ...prev, ...changes };

      // Rule: Node and edge selections are mutually exclusive
      if ('selectedNodeId' in changes && changes.selectedNodeId !== undefined) {
        if (changes.selectedNodeId !== null) {
          next.selectedEdgeId = null;
        }
      }
      if ('selectedEdgeId' in changes && changes.selectedEdgeId !== undefined) {
        if (changes.selectedEdgeId !== null) {
          next.selectedNodeId = null;
        }
      }

      // Rule: Sidebar visibility based on selection state
      // Show sidebar when anything is selected, hide when explicitly cleared
      if (next.selectedNodeId || next.selectedEdgeId || next.activeSubviewId) {
        next.sidebarHover = true;
      } else if ('activeSubviewId' in changes && changes.activeSubviewId === null) {
        // Explicitly hide sidebar when clearing subview
        next.sidebarHover = false;
      }

      return next;
    });
  };

  // ============================================================================
  // SUBVIEW OPERATIONS (Internal - called by dispatch)
  // ============================================================================

  const activateSubview = async (subviewId: string): Promise<void> => {
    const subview = subviewById.get(subviewId);
    if (!subview) {
      return;
    }

    // Guard: check transition lock
    if (transitionInProgress) {
      return;
    }

    // Guard: check duplicate activation
    if (activeSubview?.id === subview.id) {
      return;
    }

    // Deactivate current if any
    if (activeSubview) {
      await deactivateSubview();
    }

    transitionInProgress = true;

    const addedNodeIds = new Set<string>();
    const addedEdgeIds = new Set<string>();

    // Build node infos from subview node IDs
    const nodeInfos: GraphNodeInfo[] = subview.nodes
      .map(nodeId => nodeInfosById.get(nodeId) ?? createPlaceholderNode(nodeId))
      .filter(Boolean);

    // Build edge infos from subview edges
    const edgeInfos: GraphEdgeInfo[] = subview.edges.map((edge, index) => ({
      id: edge.label || `${subview.id}_edge_${index}`,
      source: edge.source,
      target: edge.target,
      label: edge.label || '',
      relation: edge.relation,
      detail: edge.detail,
      type: subview.type === 'workflow' ? 'process' : 'structural',
      process: subview.type === 'workflow' ? [subview.id] : [],
    }));

    const nodeIdSet = new Set(nodeInfos.map(node => node.id));
    const edgeIdSet = new Set(edgeInfos.map(edge => edge.id));

    // Get viewport center for workflow positioning (anchor nodes may not exist yet)
    const { centerX, centerY } = subview.type === 'workflow'
      ? getViewportMetrics(cy)
      : { centerX: 0, centerY: 0 };

    // Add nodes and edges to cytoscape
    cy.batch(() => {
      nodeInfos.forEach(nodeInfo => {
        const existing = cy.getElementById(nodeInfo.id);
        if (existing.length > 0) {
          return;
        }

        const added = cy.add({
          group: 'nodes',
          data: nodeInfo,
        });
        addedNodeIds.add(nodeInfo.id);
        added.removeData('orgPos');
        added.removeScratch('_positions');
        added.unlock();
      });

      edgeInfos.forEach(edgeInfo => {
        const existing = cy.getElementById(edgeInfo.id);
        if (existing.length > 0) {
          return;
        }

        cy.add({
          group: 'edges',
          data: edgeInfo,
        });
        addedEdgeIds.add(edgeInfo.id);
      });
    });

    // Collect cytoscape elements
    const subviewNodes = cy.nodes().filter(node => nodeIdSet.has(node.id()));
    const subviewEdges = cy.collection();
    edgeInfos.forEach(edge => {
      const cyEdge = cy.getElementById(edge.id);
      if (cyEdge && cyEdge.length > 0) {
        subviewEdges.merge(cyEdge);
      }
    });

    // Apply CSS classes based on subview type
    if (subview.type === 'workflow') {
      applyProcessHighlightClasses(cy, nodeIdSet, edgeIdSet);
    } else {
      applyStructuralSubviewClasses(cy, subviewNodes, subviewEdges);
    }

    // Run layout (workflows: viewport center, structural: entry node)
    const viewportCenter = subview.type === 'workflow' ? { x: centerX, y: centerY } : undefined;
    const layoutOptions = createStructuralLayoutOptions(subview, cy, viewportCenter);

    const layoutElements = subviewNodes.union(subviewEdges);
    const layout = layoutElements.layout(layoutOptions);
    const layoutPromise = layout.promiseOn('layoutstop');
    layout.run();
    await layoutPromise;

    // Fit viewport to new elements
    const fitPadding = subview.type === 'workflow' ? 140 : 200;
    if (subviewNodes.length > 0) {
      await cy
        .animation({
          fit: {
            eles: subviewNodes,
            padding: fitPadding,
          },
          duration: ANIMATION_DURATION,
          easing: ANIMATION_EASING,
        })
        .play()
        .promise()
        .catch(() => {});
    }

    // Store active state
    activeSubview = {
      id: subview.id,
      type: subview.type,
      addedNodeIds,
      addedEdgeIds,
      affectedNodeIds: nodeIdSet,
      affectedEdgeIds: edgeIdSet,
    };

    transitionInProgress = false;

    // Update React state
    transitionVisualizationState({
      activeSubviewId: subview.id,
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  };

  const deactivateSubview = async (): Promise<void> => {
    const currentSubview = activeSubview;
    if (!currentSubview || transitionInProgress) {
      transitionVisualizationState({
        // Keep activeScope - only clear subview state
        activeSubviewId: null,
        selectedNodeId: null,
        selectedEdgeId: null,
      });
      return;
    }

    transitionInProgress = true;

    // Remove CSS classes
    if (currentSubview.type === 'workflow') {
      resetProcessClasses(cy);
    } else {
      resetHighlightClasses(cy);
    }

    // Remove added elements
    cy.batch(() => {
      const edgesToRemove = cy.collection();
      currentSubview.addedEdgeIds.forEach(id => {
        const edge = cy.getElementById(id);
        if (edge.length > 0) {
          edgesToRemove.merge(edge);
        }
      });
      edgesToRemove.remove();

      const nodesToRemove = cy.collection();
      currentSubview.addedNodeIds.forEach(id => {
        const node = cy.getElementById(id);
        if (node.length > 0) {
          nodesToRemove.merge(node);
        }
      });
      nodesToRemove.remove();
    });

    // Restore original positions
    cy.nodes().forEach(node => {
      const orgPos = node.data('orgPos');
      if (orgPos) {
        node.position(copyPosition(orgPos));
      }
    });

    // Check if we should preserve scope
    const currentScope = getState().activeScope;

    if (currentScope) {
      // Re-apply scope styling after removing subview
      applyScopeStyling(currentScope);

      // Fit to scope nodes
      const nodeIds = scopeNodeIds[currentScope];
      await focusNodes(nodeIds);
    } else {
      // No scope - clear all styling and refit to entire graph
      clearNodeFocus();
      const fitPadding = currentSubview.type === 'workflow' ? 220 : 200;
      await runMainGraphLayout({ animateFit: true, fitPadding });
    }

    // Clear state
    activeSubview = null;
    transitionInProgress = false;

    // Update React state
    transitionVisualizationState({
      // Keep activeScope - only clear subview state
      activeSubviewId: null,
      selectedNodeId: null,
      selectedEdgeId: null,
    });
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
      applyScopeStyling(nodeScope);
    }

    // Update React state (transition function handles mutual exclusivity and sidebar)
    transitionVisualizationState({
      selectedNodeId: nodeId,
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
    transitionVisualizationState({
      selectedEdgeId: edgeId,
    });
  };

  const clearSelections = (): void => {
    // Cytoscape operations
    cy.elements().removeClass('highlighted');

    // Update React state
    transitionVisualizationState({
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  };

  // ============================================================================
  // BACKGROUND CLICK (Internal - called by dispatch)
  // ============================================================================

  const handleBackgroundClick = async (): Promise<void> => {
    const currentState = getState();

    // If there's a selected node or edge, clear only selections (keep activeScope)
    if (currentState.selectedNodeId || currentState.selectedEdgeId) {
      clearSelections();
      return;
    }

    // If there's an active subview, deactivate it (keep activeScope)
    if (currentState.activeSubviewId) {
      await deactivateSubview();
      return;
    }

    // If there's an active scope but no selections/subview, clear the scope
    if (currentState.activeScope) {
      clearNodeFocus();
      transitionVisualizationState({
        activeScope: null,
      });
    }
  };

  // ============================================================================
  // SCOPE OPERATIONS (Internal - called by dispatch)
  // ============================================================================

  const handleScopeChange = async (scope: GovernmentScope): Promise<void> => {
    // Deactivate any active subview first
    if (activeSubview) {
      await deactivateSubview();
    }

    const nodeIds = scopeNodeIds[scope];
    if (!nodeIds || nodeIds.length === 0) {
      return;
    }

    // Apply scope styling and focus
    applyScopeStyling(scope);
    await focusNodes(nodeIds);

    // Update React state
    transitionVisualizationState({
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
    const nodes = cy.nodes().filter((node) => nodeIds.includes(node.id()));
    if (nodes.empty()) {
      return;
    }

    await cy
      .animation({
        fit: { eles: nodes, padding: 100 },
        duration: 500,
      })
      .play()
      .promise();
  };

  const clearNodeFocus = (): void => {
    resetHighlightClasses(cy);
  };

  const captureInitialPositions = (): void => {
    cy.nodes().forEach((node) => {
      node.data('orgPos', copyPosition(node.position()));
    });
  };

  // ============================================================================
  // CENTRAL DISPATCH (Public API)
  // ============================================================================

  /**
   * Central dispatch function - all user interactions route through here.
   */
  const dispatch = async (action: GraphAction): Promise<void> => {
    // TODO: Add logging here for debugging
    // console.log('[Controller] Action:', action.type, action);

    switch (action.type) {
      case 'NODE_CLICK': {
        const { nodeId } = action.payload;
        const subview = config.subviewByAnchorId.get(nodeId);

        if (subview) {
          // Node is a subview anchor
          const isActive = activeSubview?.id === subview.id;
          if (isActive) {
            // Re-clicking active subview - use hierarchical clearing
            await handleBackgroundClick();
          } else {
            // Activate subview
            await activateSubview(subview.id);
          }
        } else {
          // Regular node - select it
          selectNode(nodeId);
        }
        break;
      }

      case 'EDGE_CLICK': {
        const { edgeId } = action.payload;
        selectEdge(edgeId);
        break;
      }

      case 'BACKGROUND_CLICK': {
        await handleBackgroundClick();
        break;
      }

      case 'ACTIVATE_SUBVIEW': {
        const { subviewId } = action.payload;
        await activateSubview(subviewId);
        break;
      }

      case 'DEACTIVATE_SUBVIEW': {
        await deactivateSubview();
        break;
      }

      case 'CHANGE_SCOPE': {
        const { scope } = action.payload;
        await handleScopeChange(scope);
        break;
      }

      case 'CLEAR_SCOPE': {
        clearNodeFocus();
        transitionVisualizationState({
          activeScope: null,
        });
        break;
      }

      case 'CLEAR_SELECTIONS': {
        clearSelections();
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

function createPlaceholderNode(id: string): GraphNodeInfo {
  return {
    id,
    label: id.split(':')[1] || id,
    branch: 'unknown',
    type: 'placeholder',
    process: [],
    factoid: '',
    branchColor: '#cccccc',
    system: '',
    width: 120,
    height: 60,
  };
}
