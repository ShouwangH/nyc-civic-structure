import { useCallback, useMemo, useReducer } from 'react';
import type { GovernmentScope } from '../data/datasets';
import type { ProcessDefinition } from '../data/types';
import type { SubgraphConfig } from '../graph/subgraphs';
import { GRAPH_DATA } from '../data/graphDataPipeline';
import type { VisualizationAction } from './actions';

export type VisualizationState = {
  controlsOpen: boolean;
  activeScope: GovernmentScope | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  activeProcessId: string | null;
  activeSubgraphId: string | null;
  activeSubviewId: string | null; // NEW: Unified subview ID (will replace above two)
  isSidebarHover: boolean;
};

const initialState: VisualizationState = {
  controlsOpen: true,
  activeScope: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  activeProcessId: null,
  activeSubgraphId: null,
  activeSubviewId: null,
  isSidebarHover: false,
};

const reducer = (state: VisualizationState, action: VisualizationAction): VisualizationState => {
  switch (action.type) {
    // User interaction actions - contain business logic
    case 'NODE_CLICKED': {
      // If it's a subgraph entry node, activate the subgraph
      if (action.isSubgraphEntry) {
        const subgraphId = GRAPH_DATA.maps.subgraphByEntryId.get(action.nodeId)?.meta.id;
        if (subgraphId) {
          return {
            ...state,
            selectedNodeId: null,
            selectedEdgeId: null,
            activeProcessId: null,
            activeSubgraphId: subgraphId,
            isSidebarHover: true,
          };
        }
      }

      // Otherwise, just select the node
      return {
        ...state,
        selectedEdgeId: null,
        selectedNodeId: action.nodeId,
        isSidebarHover: true,
      };
    }

    case 'EDGE_CLICKED':
      return {
        ...state,
        selectedNodeId: null,
        selectedEdgeId: action.edgeId,
        isSidebarHover: true,
      };

    case 'BACKGROUND_CLICKED':
      // Clear all selections
      return {
        ...state,
        activeScope: null,
        selectedNodeId: null,
        selectedEdgeId: null,
        activeProcessId: null,
        activeSubgraphId: null,
        isSidebarHover: false,
      };

    case 'SCOPE_SELECTED':
      // Clear all selections when scope changes
      return {
        ...state,
        activeScope: action.scope,
        selectedNodeId: null,
        selectedEdgeId: null,
        activeProcessId: null,
        activeSubgraphId: null,
        isSidebarHover: false,
      };

    case 'PROCESS_TOGGLED': {
      // Compute visibility from current scope
      const visibleProcesses = state.activeScope
        ? (GRAPH_DATA.processesByScope[state.activeScope] ?? [])
        : [];
      const isVisible = visibleProcesses.some((p) => p.id === action.processId);

      // If process not visible, warn and do nothing
      if (!isVisible) {
        console.warn('[Process] Not available for active scope', {
          processId: action.processId,
          activeScope: state.activeScope,
        });
        return state;
      }

      // If clicking same process, clear it
      if (state.activeProcessId === action.processId) {
        const shouldClearSidebar = !state.selectedNodeId && !state.selectedEdgeId;
        return {
          ...state,
          activeProcessId: null,
          isSidebarHover: shouldClearSidebar ? false : state.isSidebarHover,
        };
      }

      // Otherwise activate the process and clear any active subgraph (mutual exclusivity)
      return {
        ...state,
        activeProcessId: action.processId,
        activeSubgraphId: null,
        isSidebarHover: true,
      };
    }

    case 'SUBGRAPH_TOGGLED': {
      // Compute scope validity
      const subgraphScopeMap = new Map(
        GRAPH_DATA.scopedSubgraphConfigs.map((entry) => [entry.config.meta.id, entry.scope])
      );
      const scopeForSubgraph = subgraphScopeMap.get(action.subgraphId);
      const isValidForScope =
        !state.activeScope || !scopeForSubgraph || scopeForSubgraph === state.activeScope;

      // If subgraph not valid for scope, warn and do nothing
      if (!isValidForScope) {
        console.warn('[Subgraph] Not available for active scope', {
          subgraphId: action.subgraphId,
          activeScope: state.activeScope,
          scopeForSubgraph,
        });
        return state;
      }

      // Compute if this subgraph is currently active
      const isActive = state.activeSubgraphId === action.subgraphId;

      // If clicking same subgraph, clear it
      if (isActive) {
        return {
          ...state,
          activeSubgraphId: null,
          isSidebarHover: false,
        };
      }

      // Otherwise activate the subgraph and clear any active process (mutual exclusivity)
      return {
        ...state,
        activeSubgraphId: action.subgraphId,
        activeProcessId: null,
        isSidebarHover: true,
      };
    }

    case 'CONTROLS_TOGGLED':
      return {
        ...state,
        controlsOpen: !state.controlsOpen,
      };

    case 'SIDEBAR_HOVER_CHANGED':
      return {
        ...state,
        isSidebarHover: action.hover,
      };

    case 'SELECTION_CLEARED':
      return {
        ...state,
        activeScope: null,
        selectedNodeId: null,
        selectedEdgeId: null,
        activeProcessId: null,
        activeSubgraphId: null,
        isSidebarHover: false,
      };

    // Internal state mutation actions - kept for specific use cases
    case 'SET_CONTROLS_OPEN':
      return { ...state, controlsOpen: action.value };

    case 'SET_ACTIVE_SCOPE':
      return {
        ...state,
        activeScope: action.scope,
        selectedNodeId: null,
        selectedEdgeId: null,
        activeProcessId: null,
        activeSubgraphId: null,
        isSidebarHover: false,
      };

    case 'SET_SIDEBAR_HOVER':
      return { ...state, isSidebarHover: action.value };

    case 'CLEAR_SELECTIONS':
      return {
        ...state,
        activeScope: null,
        selectedNodeId: null,
        selectedEdgeId: null,
        activeProcessId: null,
        activeSubgraphId: null,
        isSidebarHover: false,
      };

    default:
      return state;
  }
};

export const useVisualizationState = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setControlsOpen = useCallback(
    (value: boolean) => dispatch({ type: 'SET_CONTROLS_OPEN', value }),
    [],
  );

  const toggleControlsOpen = useCallback(() => dispatch({ type: 'CONTROLS_TOGGLED' }), []);

  const setActiveScope = useCallback(
    (scope: GovernmentScope | null) => dispatch({ type: 'SET_ACTIVE_SCOPE', scope }),
    [],
  );

  const setSidebarHover = useCallback(
    (value: boolean) => dispatch({ type: 'SET_SIDEBAR_HOVER', value }),
    [],
  );

  const clearSelections = useCallback(() => dispatch({ type: 'CLEAR_SELECTIONS' }), []);

  const actions = useMemo(
    () => ({
      setControlsOpen,
      toggleControlsOpen,
      setActiveScope,
      setSidebarHover,
      clearSelections,
    }),
    [
      setControlsOpen,
      toggleControlsOpen,
      setActiveScope,
      setSidebarHover,
      clearSelections,
    ],
  );

  // Derived selectors - computed based on current state
  const derived = useMemo(() => {
    const { nodesById, edgesById } = GRAPH_DATA.indexes;
    const { subgraphById } = GRAPH_DATA.maps;
    const { allProcesses } = GRAPH_DATA;

    // Filter by scope
    const visibleProcesses = state.activeScope
      ? (GRAPH_DATA.processesByScope[state.activeScope] ?? [])
      : ([] as ProcessDefinition[]);

    // Temporarily hide all subviews from menu (still accessible via node clicks)
    // Will be accessible via sidebar-based multi-view selector in future
    const visibleSubgraphConfigs: SubgraphConfig[] = [];

    // Entity lookups
    const activeNode = state.selectedNodeId
      ? nodesById.get(state.selectedNodeId) ?? null
      : null;

    const activeEdge = state.selectedEdgeId
      ? edgesById.get(state.selectedEdgeId) ?? null
      : null;

    const activeProcess = state.activeProcessId
      ? allProcesses.find((p) => p.id === state.activeProcessId) ?? null
      : null;

    const selectedEdgeSource = activeEdge
      ? nodesById.get(activeEdge.source) ?? null
      : null;

    const selectedEdgeTarget = activeEdge
      ? nodesById.get(activeEdge.target) ?? null
      : null;

    const subgraphLabel = state.activeSubgraphId
      ? subgraphById.get(state.activeSubgraphId)?.meta.label ?? null
      : null;

    // Computed flags
    const selectionActive = Boolean(
      state.selectedNodeId ||
      state.selectedEdgeId ||
      state.activeProcessId ||
      state.activeSubgraphId
    );

    const shouldShowSidebar = selectionActive || state.isSidebarHover;

    return {
      // Filtered lists
      visibleProcesses,
      visibleSubgraphConfigs,

      // Entity lookups
      activeNode,
      activeEdge,
      activeProcess,
      selectedEdgeSource,
      selectedEdgeTarget,
      subgraphLabel,

      // Computed flags
      selectionActive,
      shouldShowSidebar,
    };
  }, [
    state.activeScope,
    state.selectedNodeId,
    state.selectedEdgeId,
    state.activeProcessId,
    state.activeSubgraphId,
    state.isSidebarHover,
  ]);

  return {
    state,
    actions,
    derived,
    dispatch, // Expose dispatch for semantic actions
  };
};

export const createVisualizationStateResetter = () => ({
  reset: () => initialState,
});
