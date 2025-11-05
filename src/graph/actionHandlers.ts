// ABOUTME: Action handlers coordinating routing and state management
// ABOUTME: Applies state changes returned from controllers to React state

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
 * Coordinates between controllers and React state
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
 * Creates action handlers
 *
 * Responsibilities:
 * - Routing logic: Decides which controller to call based on input
 * - State coordination: Applies state changes returned from controllers
 *
 * Controllers are React-agnostic and return what state should change.
 * Handlers apply those changes to React state.
 *
 * Usage:
 * const handlers = createGraphActionHandlers(config);
 * handlers.handleNodeClick(nodeId);
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
   * Activate subview by ID
   */
  const activateSubview = async (subviewId: string): Promise<void> => {
    const subview = subviewById.get(subviewId);
    if (!subview) {
      return;
    }

    const stateChanges = await subviewController.activate(subview);

    setState(prev => ({
      ...prev,
      ...stateChanges,
    }));
  };

  /**
   * Deactivate all active states
   */
  const deactivateAll = async (): Promise<void> => {
    const stateChanges = await subviewController.deactivate();
    clearNodeFocus();

    setState(prev => ({
      ...prev,
      activeScope: null,
      ...stateChanges,
    }));
  };

  /**
   * Handle node clicks with routing logic
   *
   * Routes to appropriate controller based on node type.
   * Easy to extend with new node types (budget, comptroller, etc.)
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

    // Route 2: Default - select the node
    setState(prev => ({
      ...prev,
      selectedNodeId: nodeId,
      selectedEdgeId: null,
      isSidebarHover: true,
    }));
  };

  /**
   * Handle edge clicks
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
   */
  const handleBackgroundClick = async (): Promise<void> => {
    await deactivateAll();
  };

  /**
   * Handle scope changes
   */
  const handleScopeChange = async (scope: GovernmentScope | null): Promise<void> => {
    const stateChanges = await subviewController.deactivate();
    clearNodeFocus();

    if (scope) {
      const nodeIds = scopeNodeIds[scope] ?? [];

      if (nodeIds.length > 0) {
        await focusNodes(nodeIds);
      }

      setState(prev => ({
        ...prev,
        activeScope: scope,
        ...stateChanges,
      }));
    } else {
      setState(prev => ({
        ...prev,
        activeScope: null,
        ...stateChanges,
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
