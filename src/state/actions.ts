// ABOUTME: Action type definitions for visualization state
// ABOUTME: Represents user intentions and events, not just state mutations

import type { GovernmentScope } from '../data/datasets';

/**
 * User interaction actions - represent user intentions
 */

// Graph canvas interactions
export type NodeClickedAction = {
  type: 'NODE_CLICKED';
  nodeId: string;
  isSubgraphEntry: boolean;
};

export type EdgeClickedAction = {
  type: 'EDGE_CLICKED';
  edgeId: string;
};

export type BackgroundClickedAction = {
  type: 'BACKGROUND_CLICKED';
};

// Scope interactions
export type ScopeSelectedAction = {
  type: 'SCOPE_SELECTED';
  scope: GovernmentScope;
};

// Process interactions
export type ProcessToggledAction = {
  type: 'PROCESS_TOGGLED';
  processId: string;
  isVisible: boolean;
};

// Subgraph interactions
export type SubgraphToggledAction = {
  type: 'SUBGRAPH_TOGGLED';
  subgraphId: string;
  isActive: boolean;
  isValidForScope: boolean;
};

// UI interactions
export type ControlsToggledAction = {
  type: 'CONTROLS_TOGGLED';
};

export type SidebarHoverChangedAction = {
  type: 'SIDEBAR_HOVER_CHANGED';
  hover: boolean;
};

export type SelectionClearedAction = {
  type: 'SELECTION_CLEARED';
};

/**
 * Internal state mutation actions - for imperative APIs
 * These are kept for backwards compatibility with GraphRuntime
 */
export type SetSelectedNodeAction = {
  type: 'SET_SELECTED_NODE';
  id: string | null;
};

export type SetSelectedEdgeAction = {
  type: 'SET_SELECTED_EDGE';
  id: string | null;
};

export type SetActiveProcessAction = {
  type: 'SET_ACTIVE_PROCESS';
  id: string | null;
};

export type SetActiveSubgraphAction = {
  type: 'SET_ACTIVE_SUBGRAPH';
  id: string | null;
};

export type SetActiveScopeAction = {
  type: 'SET_ACTIVE_SCOPE';
  scope: GovernmentScope | null;
};

export type SetSidebarHoverAction = {
  type: 'SET_SIDEBAR_HOVER';
  value: boolean;
};

export type ClearFocusAction = {
  type: 'CLEAR_FOCUS';
};

export type ClearSelectionsAction = {
  type: 'CLEAR_SELECTIONS';
};

export type SetControlsOpenAction = {
  type: 'SET_CONTROLS_OPEN';
  value: boolean;
};

export type ResetAllAction = {
  type: 'RESET_ALL';
  scopeOverride?: GovernmentScope | null;
};

/**
 * Union of all action types
 */
export type VisualizationAction =
  // User interaction actions
  | NodeClickedAction
  | EdgeClickedAction
  | BackgroundClickedAction
  | ScopeSelectedAction
  | ProcessToggledAction
  | SubgraphToggledAction
  | ControlsToggledAction
  | SidebarHoverChangedAction
  | SelectionClearedAction
  // Internal state mutation actions
  | SetSelectedNodeAction
  | SetSelectedEdgeAction
  | SetActiveProcessAction
  | SetActiveSubgraphAction
  | SetActiveScopeAction
  | SetSidebarHoverAction
  | ClearFocusAction
  | ClearSelectionsAction
  | SetControlsOpenAction
  | ResetAllAction;

/**
 * Action creators - pure functions that create action objects
 */
export const actions = {
  // User interaction actions
  nodeClicked: (nodeId: string, isSubgraphEntry: boolean): NodeClickedAction => ({
    type: 'NODE_CLICKED',
    nodeId,
    isSubgraphEntry,
  }),

  edgeClicked: (edgeId: string): EdgeClickedAction => ({
    type: 'EDGE_CLICKED',
    edgeId,
  }),

  backgroundClicked: (): BackgroundClickedAction => ({
    type: 'BACKGROUND_CLICKED',
  }),

  scopeSelected: (scope: GovernmentScope): ScopeSelectedAction => ({
    type: 'SCOPE_SELECTED',
    scope,
  }),

  processToggled: (
    processId: string,
    isVisible: boolean,
  ): ProcessToggledAction => ({
    type: 'PROCESS_TOGGLED',
    processId,
    isVisible,
  }),

  subgraphToggled: (
    subgraphId: string,
    isActive: boolean,
    isValidForScope: boolean,
  ): SubgraphToggledAction => ({
    type: 'SUBGRAPH_TOGGLED',
    subgraphId,
    isActive,
    isValidForScope,
  }),

  controlsToggled: (): ControlsToggledAction => ({
    type: 'CONTROLS_TOGGLED',
  }),

  sidebarHoverChanged: (hover: boolean): SidebarHoverChangedAction => ({
    type: 'SIDEBAR_HOVER_CHANGED',
    hover,
  }),

  selectionCleared: (): SelectionClearedAction => ({
    type: 'SELECTION_CLEARED',
  }),

  // Internal state mutation actions
  setSelectedNode: (id: string | null): SetSelectedNodeAction => ({
    type: 'SET_SELECTED_NODE',
    id,
  }),

  setSelectedEdge: (id: string | null): SetSelectedEdgeAction => ({
    type: 'SET_SELECTED_EDGE',
    id,
  }),

  setActiveProcess: (id: string | null): SetActiveProcessAction => ({
    type: 'SET_ACTIVE_PROCESS',
    id,
  }),

  setActiveSubgraph: (id: string | null): SetActiveSubgraphAction => ({
    type: 'SET_ACTIVE_SUBGRAPH',
    id,
  }),

  setActiveScope: (scope: GovernmentScope | null): SetActiveScopeAction => ({
    type: 'SET_ACTIVE_SCOPE',
    scope,
  }),

  setSidebarHover: (value: boolean): SetSidebarHoverAction => ({
    type: 'SET_SIDEBAR_HOVER',
    value,
  }),

  clearFocus: (): ClearFocusAction => ({
    type: 'CLEAR_FOCUS',
  }),

  clearSelections: (): ClearSelectionsAction => ({
    type: 'CLEAR_SELECTIONS',
  }),

  setControlsOpen: (value: boolean): SetControlsOpenAction => ({
    type: 'SET_CONTROLS_OPEN',
    value,
  }),

  resetAll: (scopeOverride?: GovernmentScope | null): ResetAllAction => ({
    type: 'RESET_ALL',
    scopeOverride,
  }),
};
