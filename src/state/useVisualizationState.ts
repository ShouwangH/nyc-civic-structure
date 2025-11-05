import { useCallback, useMemo, useReducer } from 'react';
import type { GovernmentScope } from '../data/datasets';
import type { ProcessDefinition, SubviewDefinition } from '../data/types';
import { GRAPH_DATA } from '../data/graphDataPipeline';

export type VisualizationState = {
  controlsOpen: boolean;
  activeScope: GovernmentScope | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  activeSubviewId: string | null;
  isSidebarHover: boolean;
};

type VisualizationAction =
  | { type: 'UPDATE'; updater: (prev: VisualizationState) => VisualizationState }
  | { type: 'TOGGLE_CONTROLS' }
  | { type: 'SET_SIDEBAR_HOVER'; hover: boolean }
  | { type: 'CLEAR_SELECTIONS' };

function visualizationReducer(
  state: VisualizationState,
  action: VisualizationAction
): VisualizationState {
  switch (action.type) {
    case 'UPDATE':
      return action.updater(state);

    case 'TOGGLE_CONTROLS':
      return { ...state, controlsOpen: !state.controlsOpen };

    case 'SET_SIDEBAR_HOVER':
      return { ...state, isSidebarHover: action.hover };

    case 'CLEAR_SELECTIONS':
      return {
        ...state,
        activeScope: null,
        selectedNodeId: null,
        selectedEdgeId: null,
        activeSubviewId: null,
        isSidebarHover: false,
      };

    default:
      return state;
  }
}

const initialState: VisualizationState = {
  controlsOpen: true,
  activeScope: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  activeSubviewId: null,
  isSidebarHover: false,
};

export const useVisualizationState = () => {
  const [state, dispatch] = useReducer(visualizationReducer, initialState);

  const setState = useCallback((updater: (prev: VisualizationState) => VisualizationState) => {
    dispatch({ type: 'UPDATE', updater });
  }, []);

  const actions = {
    toggleControlsOpen: () => dispatch({ type: 'TOGGLE_CONTROLS' }),
    setSidebarHover: (hover: boolean) => dispatch({ type: 'SET_SIDEBAR_HOVER', hover }),
    clearSelections: () => dispatch({ type: 'CLEAR_SELECTIONS' }),
  };

  // Derived selectors - computed based on current state
  const derived = useMemo(() => {
    const { nodesById, edgesById } = GRAPH_DATA.indexes;
    const { subviewById } = GRAPH_DATA.maps;
    const { allProcesses } = GRAPH_DATA;

    // Filter by scope
    const visibleProcesses = state.activeScope
      ? (GRAPH_DATA.processesByScope[state.activeScope] ?? [])
      : ([] as ProcessDefinition[]);

    // Show all non-workflow subviews for the current scope
    const visibleSubviews: SubviewDefinition[] = state.activeScope
      ? Array.from(GRAPH_DATA.maps.subviewById.values()).filter(subview => {
          return subview.jurisdiction === state.activeScope && subview.type !== 'workflow';
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

    const subviewLabel = state.activeSubviewId
      ? (subviewById.get(state.activeSubviewId)?.label ?? null)
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
      visibleSubviews,

      // Entity lookups
      activeNode,
      activeEdge,
      activeProcess,
      selectedEdgeSource,
      selectedEdgeTarget,
      subviewLabel,

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

  return {
    state,
    actions,
    derived,
    setState,
  };
};
