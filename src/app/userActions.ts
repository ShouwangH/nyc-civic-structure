import type { GraphCanvasHandle } from '../components/GraphCanvas';
import type { GovernmentScope } from '../data/datasets';
import type { ProcessDefinition } from '../data/types';
import type { SubgraphConfig } from '../graph/subgraphs';

/**
 * State actions interface - maps to actions from useVisualizationState
 */
type StateActions = {
  setActiveScope: (scope: GovernmentScope | null) => void;
  setActiveProcess: (id: string | null) => void;
  setActiveSubgraph: (id: string | null) => void;
  setSidebarHover: (value: boolean) => void;
  clearFocus: () => void;
  clearSelections: () => void;
};

/**
 * Orchestrates focusing on a specific government scope.
 * Updates state, clears previous selections, and focuses graph on scope nodes.
 */
export const focusScope = async (params: {
  scope: GovernmentScope;
  graphHandle: GraphCanvasHandle | null;
  scopeNodeIds: Record<GovernmentScope, string[]>;
  actions: Pick<StateActions, 'setActiveScope' | 'clearFocus' | 'setSidebarHover'>;
}): Promise<void> => {
  const { scope, graphHandle, scopeNodeIds, actions } = params;

  actions.setActiveScope(scope);
  actions.clearFocus();
  actions.setSidebarHover(false);

  const nodeIds = scopeNodeIds[scope] ?? [];
  if (!graphHandle || nodeIds.length === 0) {
    return;
  }

  await graphHandle.clearProcessHighlight();
  await graphHandle.restoreMainView();
  graphHandle.clearNodeFocus();
  await graphHandle.focusNodes(nodeIds);
};

/**
 * Orchestrates toggling a process highlight on the graph.
 * Handles visibility checks, subgraph restoration, and highlight toggle logic.
 */
export const toggleProcess = async (params: {
  processId: string;
  graphHandle: GraphCanvasHandle | null;
  state: {
    activeProcessId: string | null;
    activeScope: GovernmentScope | null;
    activeSubgraphId: string | null;
    selectedNodeId: string | null;
    selectedEdgeId: string | null;
  };
  visibleProcesses: ProcessDefinition[];
  allProcesses: ProcessDefinition[];
  actions: Pick<StateActions, 'setSidebarHover'>;
}): Promise<void> => {
  const { processId, graphHandle, state, visibleProcesses, allProcesses, actions } = params;

  if (!graphHandle) {
    return;
  }

  const isProcessVisible = visibleProcesses.some((process) => process.id === processId);
  if (!isProcessVisible) {
    console.warn('[Process] Not available for active scope', {
      processId,
      activeScope: state.activeScope,
    });
    return;
  }

  if (state.activeSubgraphId) {
    await graphHandle.restoreMainView();
  }

  if (state.activeProcessId === processId) {
    await graphHandle.clearProcessHighlight();
    if (!state.selectedNodeId && !state.selectedEdgeId) {
      actions.setSidebarHover(false);
    }
    return;
  }

  if (!allProcesses.find((process) => process.id === processId)) {
    console.warn('[Process] Definition not found for process', processId);
    return;
  }

  await graphHandle.highlightProcess(processId);
  actions.setSidebarHover(true);
};

/**
 * Orchestrates toggling a subgraph view on the graph.
 * Handles scope validation, process clearing, and subgraph activation/deactivation.
 */
export const toggleSubgraph = async (params: {
  subgraphId: string;
  graphHandle: GraphCanvasHandle | null;
  state: {
    activeProcessId: string | null;
    activeScope: GovernmentScope | null;
  };
  subgraphScopeById: Map<string, GovernmentScope | null>;
  subgraphById: Map<string, SubgraphConfig>;
  actions: Pick<StateActions, 'setSidebarHover'>;
}): Promise<void> => {
  const { subgraphId, graphHandle, state, subgraphScopeById, subgraphById, actions } = params;

  if (!graphHandle) {
    return;
  }

  const scopeForSubgraph = subgraphScopeById.get(subgraphId);
  if (state.activeScope && scopeForSubgraph && scopeForSubgraph !== state.activeScope) {
    console.warn('[Subgraph] Not available for active scope', {
      subgraphId,
      activeScope: state.activeScope,
      scopeForSubgraph,
    });
    return;
  }

  if (state.activeProcessId) {
    await graphHandle.clearProcessHighlight();
  }

  const controller = graphHandle.getController();
  if (controller?.isSubgraphActive(subgraphId)) {
    await graphHandle.restoreMainView();
    actions.setSidebarHover(false);
    return;
  }

  if (!subgraphById.has(subgraphId)) {
    console.warn('[Subgraph] Definition not found for subgraph', subgraphId);
    return;
  }

  await graphHandle.activateSubgraph(subgraphId);
  actions.setSidebarHover(true);
};

/**
 * Orchestrates clearing all selections (process, subgraph, nodes, edges).
 * Restores graph to default view state.
 */
export const clearSelection = async (params: {
  graphHandle: GraphCanvasHandle | null;
  state: {
    activeProcessId: string | null;
    activeSubgraphId: string | null;
  };
  actions: Pick<StateActions, 'clearSelections'>;
}): Promise<void> => {
  const { graphHandle, state, actions } = params;

  if (state.activeProcessId) {
    if (graphHandle) {
      await graphHandle.clearProcessHighlight();
    }
  }

  if (state.activeSubgraphId) {
    if (graphHandle) {
      await graphHandle.restoreMainView();
    }
  }

  if (graphHandle) {
    graphHandle.clearNodeFocus();
  }

  actions.clearSelections();
};
