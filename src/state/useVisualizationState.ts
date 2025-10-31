import { useCallback, useMemo, useReducer } from 'react';
import type { GovernmentScope } from '../data/datasets';

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

type Action =
  | { type: 'setControlsOpen'; value: boolean }
  | { type: 'toggleControlsOpen' }
  | { type: 'setActiveScope'; scope: GovernmentScope | null }
  | { type: 'setSelectedNode'; id: string | null }
  | { type: 'setSelectedEdge'; id: string | null }
  | { type: 'setActiveProcess'; id: string | null }
  | { type: 'setActiveSubgraph'; id: string | null }
  | { type: 'setSidebarHover'; value: boolean }
  | { type: 'clearFocus' }
  | { type: 'clearSelections' }
  | { type: 'resetAll'; scopeOverride?: GovernmentScope | null };

const reducer = (state: VisualizationState, action: Action): VisualizationState => {
  switch (action.type) {
    case 'setControlsOpen':
      return { ...state, controlsOpen: action.value };
    case 'toggleControlsOpen':
      return { ...state, controlsOpen: !state.controlsOpen };
    case 'setActiveScope':
      return {
        ...state,
        activeScope: action.scope,
        selectedNodeId: null,
        selectedEdgeId: null,
        activeProcessId: null,
        activeSubgraphId: null,
        isSidebarHover: false,
      };
    case 'setSelectedNode':
      return { ...state, selectedNodeId: action.id };
    case 'setSelectedEdge':
      return { ...state, selectedEdgeId: action.id };
    case 'setActiveProcess':
      return { ...state, activeProcessId: action.id };
    case 'setActiveSubgraph':
      return { ...state, activeSubgraphId: action.id };
    case 'setSidebarHover':
      return { ...state, isSidebarHover: action.value };
    case 'clearFocus':
      return {
        ...state,
        selectedNodeId: null,
        selectedEdgeId: null,
        activeProcessId: null,
        activeSubgraphId: null,
        isSidebarHover: false,
      };
    case 'clearSelections':
      return {
        ...state,
        activeScope: null,
        selectedNodeId: null,
        selectedEdgeId: null,
        activeProcessId: null,
        activeSubgraphId: null,
        isSidebarHover: false,
      };
    case 'resetAll':
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
    (value: boolean) => dispatch({ type: 'setControlsOpen', value }),
    [],
  );

  const toggleControlsOpen = useCallback(() => dispatch({ type: 'toggleControlsOpen' }), []);

  const setActiveScope = useCallback(
    (scope: GovernmentScope | null) => dispatch({ type: 'setActiveScope', scope }),
    [],
  );

  const setSelectedNode = useCallback(
    (id: string | null) => dispatch({ type: 'setSelectedNode', id }),
    [],
  );

  const setSelectedEdge = useCallback(
    (id: string | null) => dispatch({ type: 'setSelectedEdge', id }),
    [],
  );

  const setActiveProcess = useCallback(
    (id: string | null) => dispatch({ type: 'setActiveProcess', id }),
    [],
  );

  const setActiveSubgraph = useCallback(
    (id: string | null) => dispatch({ type: 'setActiveSubgraph', id }),
    [],
  );

  const setSidebarHover = useCallback(
    (value: boolean) => dispatch({ type: 'setSidebarHover', value }),
    [],
  );

  const clearFocus = useCallback(() => dispatch({ type: 'clearFocus' }), []);

  const clearSelections = useCallback(() => dispatch({ type: 'clearSelections' }), []);

  const resetAll = useCallback(
    (scopeOverride?: GovernmentScope) => dispatch({ type: 'resetAll', scopeOverride }),
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

  return {
    state,
    actions,
  };
};

export const createVisualizationStateResetter = () => ({
  reset: () => initialState,
});
