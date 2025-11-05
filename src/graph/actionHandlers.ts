// ABOUTME: Imperative action handlers with explicit routing logic
// ABOUTME: Syncs SubviewController operations with React state manually

import type { SubviewController } from './subview-controller';
import type { SubviewDefinition } from '../data/types';
import type { VisualizationState } from '../state/useVisualizationState';
import type { GovernmentScope } from '../data/datasets';

/**
 * State updater function type
 * Matches React's setState signature for functional updates
 */
type StateUpdater = (updater: (prev: VisualizationState) => VisualizationState) => void;

/**
 * Public API for graph action handlers
 * All methods sync controller operations with React state
 */
export type GraphActionHandlers = {
  handleNodeClick: (nodeId: string) => Promise<void>;
  handleEdgeClick: (edgeId: string) => void;
  handleBackgroundClick: () => Promise<void>;
  handleScopeChange: (scope: GovernmentScope | null) => Promise<void>;
  activateSubview: (subviewId: string) => Promise<void>;
  deactivateAll: () => Promise<void>;
};

/**
 * Configuration for creating action handlers
 */
type CreateHandlersConfig = {
  subviewController: SubviewController;
  setState: StateUpdater;
  subviewByAnchorId: Map<string, SubviewDefinition>;
  subviewById: Map<string, SubviewDefinition>;
  scopeNodeIds: Record<GovernmentScope, string[]>;
  focusNodes: (nodeIds: string[]) => Promise<void>;
  clearNodeFocus: () => void;
};

/**
 * Creates imperative action handlers
 *
 * Pattern: Imperative Handler with Manual State Sync
 * - Handlers call controller methods directly
 * - Manually sync React state after each operation
 * - Explicit routing logic (no implicit state-driven effects)
 *
 * Benefits:
 * - All routing logic in one place (easy to extend)
 * - Linear execution flow (easy to debug)
 * - Can't forget to sync state (wrappers enforce it)
 *
 * Usage:
 * const handlers = createGraphActionHandlers(config);
 * handlers.handleNodeClick(nodeId); // ← Explicit call, automatic sync
 */
export const createGraphActionHandlers = (config: CreateHandlersConfig): GraphActionHandlers => {
  const {
    subviewController,
    setState,
    subviewByAnchorId,
    subviewById,
    scopeNodeIds,
    focusNodes,
    clearNodeFocus,
  } = config;

  /**
   * Wrapper: Activate subview by ID
   * Syncs controller + React state together
   */
  const activateSubview = async (subviewId: string): Promise<void> => {
    const subview = subviewById.get(subviewId);
    if (!subview) {
      console.warn('[Handlers] Subview not found', subviewId);
      return;
    }

    // Call controller
    await subviewController.activate(subview);

    // Sync React state (always paired with controller call)
    setState(prev => ({
      ...prev,
      activeSubviewId: subviewId,
      selectedNodeId: null,
      selectedEdgeId: null,
      isSidebarHover: true,
    }));
  };

  /**
   * Wrapper: Deactivate all active states
   * Clears both controller and React state
   */
  const deactivateAll = async (): Promise<void> => {
    // Clear controller state
    await subviewController.deactivate();
    clearNodeFocus();

    // Clear React state
    setState(prev => ({
      ...prev,
      activeScope: null,
      activeSubviewId: null,
      selectedNodeId: null,
      selectedEdgeId: null,
      isSidebarHover: false,
    }));
  };

  /**
   * EXPLICIT ROUTING: Handle node clicks
   *
   * This is where all node click routing logic lives.
   * Easy to add new cases (budget, comptroller, etc.)
   */
  const handleNodeClick = async (nodeId: string): Promise<void> => {
    // Route 1: Check if node has subview
    const subview = subviewByAnchorId.get(nodeId);

    if (subview) {
      // Node is a subview anchor
      const isCurrentlyActive = subviewController.isActive(subview.id);

      if (isCurrentlyActive) {
        // Clicking same subview - deactivate
        await deactivateAll();
      } else {
        // Activate subview
        await activateSubview(subview.id);
      }
      return;
    }

    // Route 2: Future - check if budget entity
    // if (nodeData?.type === 'budget_entity') {
    //   await activateBudgetView(nodeId);
    //   return;
    // }

    // Route 3: Future - check if comptroller entity
    // if (nodeData?.type === 'comptroller_entity') {
    //   await activateComptrollerView(nodeId);
    //   return;
    // }

    // Route 4: Default - just select the node
    setState(prev => ({
      ...prev,
      selectedNodeId: nodeId,
      selectedEdgeId: null,
      isSidebarHover: true,
    }));
  };

  /**
   * Handle edge clicks
   * Simple selection, no routing needed
   */
  const handleEdgeClick = (edgeId: string): void => {
    setState(prev => ({
      ...prev,
      selectedNodeId: null,
      selectedEdgeId: edgeId,
      isSidebarHover: true,
    }));
  };

  /**
   * Handle background clicks
   * Clear all active states
   */
  const handleBackgroundClick = async (): Promise<void> => {
    await deactivateAll();
  };

  /**
   * Handle scope changes
   * Clear all states, then focus on scope nodes
   */
  const handleScopeChange = async (scope: GovernmentScope | null): Promise<void> => {
    // Clear all active states first
    await subviewController.deactivate();
    clearNodeFocus();

    if (scope) {
      // Focus on scope's nodes
      const nodeIds = scopeNodeIds[scope] ?? [];

      if (nodeIds.length > 0) {
        await focusNodes(nodeIds);
      }

      // Update React state
      setState(prev => ({
        ...prev,
        activeScope: scope,
        activeSubviewId: null,
        selectedNodeId: null,
        selectedEdgeId: null,
        isSidebarHover: false,
      }));
    } else {
      // No scope - clear everything
      setState(prev => ({
        ...prev,
        activeScope: null,
        activeSubviewId: null,
        selectedNodeId: null,
        selectedEdgeId: null,
        isSidebarHover: false,
      }));
    }
  };

  return {
    handleNodeClick,
    handleEdgeClick,
    handleBackgroundClick,
    handleScopeChange,
    activateSubview,
    deactivateAll,
  };
};
