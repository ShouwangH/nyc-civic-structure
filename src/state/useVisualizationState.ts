import { useCallback, useMemo, useReducer, useRef } from 'react';
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
  activeSubviewId: string | null;
  isSidebarHover: boolean;
};

const initialState: VisualizationState = {
  controlsOpen: true,
  activeScope: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  activeSubviewId: null,
  isSidebarHover: false,
};

const reducer = (state: VisualizationState, action: VisualizationAction): VisualizationState => {
  switch (action.type) {
    // User interaction actions - contain business logic
    case 'NODE_CLICKED':
      return {
        ...state,
        selectedEdgeId: null,
        selectedNodeId: action.nodeId,
        isSidebarHover: true,
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
        isSidebarHover: false,
      };

    case 'SCOPE_SELECTED':
      // Clear all selections when scope changes
      return {
        ...state,
        activeScope: action.scope,
        selectedNodeId: null,
        selectedEdgeId: null,
        isSidebarHover: false,
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
        activeSubviewId: null,
        isSidebarHover: false,
      };

    // NEW: Direct state update for imperative handlers
    case 'STATE_UPDATED':
      return { ...state, ...action.payload };

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

    // Show all non-workflow subviews for the current scope
    const visibleSubgraphConfigs: SubgraphConfig[] = state.activeScope
      ? Array.from(GRAPH_DATA.maps.subgraphById.values()).filter(config => {
          const scope = GRAPH_DATA.indexes.subgraphScopeById.get(config.meta.id);
          return scope === state.activeScope;
        })
      : [];

    // Entity lookups
    const activeNode = state.selectedNodeId
      ? nodesById.get(state.selectedNodeId) ?? null
      : null;

    const activeEdge = state.selectedEdgeId
      ? edgesById.get(state.selectedEdgeId) ?? null
      : null;

    const activeProcess = state.activeSubviewId
      ? allProcesses.find((p) => p.id === state.activeSubviewId) ?? null
      : null;

    const selectedEdgeSource = activeEdge
      ? nodesById.get(activeEdge.source) ?? null
      : null;

    const selectedEdgeTarget = activeEdge
      ? nodesById.get(activeEdge.target) ?? null
      : null;

    const subgraphLabel = state.activeSubviewId
      ? (subgraphById.get(state.activeSubviewId)?.meta.label ??
         GRAPH_DATA.maps.subviewById.get(state.activeSubviewId)?.label ??
         null)
      : null;

    // Computed flags
    const selectionActive = Boolean(
      state.selectedNodeId ||
      state.selectedEdgeId ||
      state.activeSubviewId
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
    state.activeSubviewId,
    state.isSidebarHover,
  ]);

  // NEW: setState wrapper for imperative handlers
  // Allows handlers to update state directly with functional updates
  // Use ref to get latest state without causing re-renders
  const stateRef = useRef(state);
  stateRef.current = state;

  const setState = useCallback(
    (updater: (prev: VisualizationState) => VisualizationState) => {
      const newState = updater(stateRef.current);
      // Dispatch a direct state update action
      dispatch({ type: 'STATE_UPDATED', payload: newState });
    },
    [dispatch], // Only depend on dispatch, which is stable
  );

  return {
    state,
    actions,
    derived,
    dispatch, // Expose dispatch for semantic actions
    setState, // NEW: Expose setState for imperative handlers
  };
};

export const createVisualizationStateResetter = () => ({
  reset: () => initialState,
});
