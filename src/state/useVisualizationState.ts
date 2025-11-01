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
  isSidebarHover: boolean;
};

const initialState: VisualizationState = {
  controlsOpen: true,
  activeScope: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  activeProcessId: null,
  activeSubgraphId: null,
  isSidebarHover: false,
};

const reducer = (state: VisualizationState, action: VisualizationAction): VisualizationState => {
  switch (action.type) {
    // User interaction actions - contain business logic
    case 'NODE_CLICKED':
      // If it's a subgraph entry node, mark for subgraph activation
      // Otherwise, just select the node
      return {
        ...state,
        selectedEdgeId: null,
        selectedNodeId: action.nodeId,
        isSidebarHover: true,
        // Note: Subgraph activation will be handled by effect layer
      };

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

    case 'PROCESS_TOGGLED':
      // If process not visible, warn and do nothing
      if (!action.isVisible) {
        console.warn('[Process] Not available for active scope', { processId: action.processId });
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

      // Otherwise activate the process
      return {
        ...state,
        activeProcessId: action.processId,
        isSidebarHover: true,
      };

    case 'SUBGRAPH_TOGGLED':
      // If subgraph not valid for scope, warn and do nothing
      if (!action.isValidForScope) {
        console.warn('[Subgraph] Not available for active scope', { subgraphId: action.subgraphId });
        return state;
      }

      // If clicking same subgraph, clear it
      if (action.isActive) {
        return {
          ...state,
          activeSubgraphId: null,
          isSidebarHover: false,
        };
      }

      // Otherwise activate the subgraph
      return {
        ...state,
        activeSubgraphId: action.subgraphId,
        isSidebarHover: true,
      };

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

    // Internal state mutation actions - for backwards compatibility
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

    case 'SET_SELECTED_NODE':
      return { ...state, selectedNodeId: action.id };

    case 'SET_SELECTED_EDGE':
      return { ...state, selectedEdgeId: action.id };

    case 'SET_ACTIVE_PROCESS':
      return { ...state, activeProcessId: action.id };

    case 'SET_ACTIVE_SUBGRAPH':
      return { ...state, activeSubgraphId: action.id };

    case 'SET_SIDEBAR_HOVER':
      return { ...state, isSidebarHover: action.value };

    case 'CLEAR_FOCUS':
      return {
        ...state,
        selectedNodeId: null,
        selectedEdgeId: null,
        activeProcessId: null,
        activeSubgraphId: null,
        isSidebarHover: false,
      };

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

    case 'RESET_ALL':
      return {
        ...initialState,
        activeScope: action.scopeOverride ?? null,
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

  const setSelectedNode = useCallback(
    (id: string | null) => dispatch({ type: 'SET_SELECTED_NODE', id }),
    [],
  );

  const setSelectedEdge = useCallback(
    (id: string | null) => dispatch({ type: 'SET_SELECTED_EDGE', id }),
    [],
  );

  const setActiveProcess = useCallback(
    (id: string | null) => dispatch({ type: 'SET_ACTIVE_PROCESS', id }),
    [],
  );

  const setActiveSubgraph = useCallback(
    (id: string | null) => dispatch({ type: 'SET_ACTIVE_SUBGRAPH', id }),
    [],
  );

  const setSidebarHover = useCallback(
    (value: boolean) => dispatch({ type: 'SET_SIDEBAR_HOVER', value }),
    [],
  );

  const clearFocus = useCallback(() => dispatch({ type: 'CLEAR_FOCUS' }), []);

  const clearSelections = useCallback(() => dispatch({ type: 'CLEAR_SELECTIONS' }), []);

  const resetAll = useCallback(
    (scopeOverride?: GovernmentScope) => dispatch({ type: 'RESET_ALL', scopeOverride }),
    [],
  );

  const actions = useMemo(
    () => ({
      setControlsOpen,
      toggleControlsOpen,
      setActiveScope,
      setSelectedNode,
      setSelectedEdge,
      setActiveProcess,
      setActiveSubgraph,
      setSidebarHover,
      clearFocus,
      clearSelections,
      resetAll,
    }),
    [
      setControlsOpen,
      toggleControlsOpen,
      setActiveScope,
      setSelectedNode,
      setSelectedEdge,
      setActiveProcess,
      setActiveSubgraph,
      setSidebarHover,
      clearFocus,
      clearSelections,
      resetAll,
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

    const visibleSubgraphConfigs = state.activeScope
      ? GRAPH_DATA.scopedSubgraphConfigs
          .filter((entry) => entry.scope === state.activeScope)
          .map((entry) => entry.config)
      : ([] as SubgraphConfig[]);

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
  };
};

export const createVisualizationStateResetter = () => ({
  reset: () => initialState,
});
