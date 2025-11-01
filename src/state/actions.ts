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
  // Reducer will compute visibility from state + GRAPH_DATA
};

// Subgraph interactions
export type SubgraphToggledAction = {
  type: 'SUBGRAPH_TOGGLED';
  subgraphId: string;
  // Reducer will compute isActive and isValidForScope from state + GRAPH_DATA
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
 * Internal state mutation actions - for specific use cases
 */
export type SetActiveScopeAction = {
  type: 'SET_ACTIVE_SCOPE';
  scope: GovernmentScope | null;
};

export type SetSidebarHoverAction = {
  type: 'SET_SIDEBAR_HOVER';
  value: boolean;
};

export type ClearSelectionsAction = {
  type: 'CLEAR_SELECTIONS';
};

export type SetControlsOpenAction = {
  type: 'SET_CONTROLS_OPEN';
  value: boolean;
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
  | SetActiveScopeAction
  | SetSidebarHoverAction
  | ClearSelectionsAction
  | SetControlsOpenAction;

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

  processToggled: (processId: string): ProcessToggledAction => ({
    type: 'PROCESS_TOGGLED',
    processId,
  }),

  subgraphToggled: (subgraphId: string): SubgraphToggledAction => ({
    type: 'SUBGRAPH_TOGGLED',
    subgraphId,
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
  setActiveScope: (scope: GovernmentScope | null): SetActiveScopeAction => ({
    type: 'SET_ACTIVE_SCOPE',
    scope,
  }),

  setSidebarHover: (value: boolean): SetSidebarHoverAction => ({
    type: 'SET_SIDEBAR_HOVER',
    value,
  }),

  clearSelections: (): ClearSelectionsAction => ({
    type: 'CLEAR_SELECTIONS',
  }),

  setControlsOpen: (value: boolean): SetControlsOpenAction => ({
    type: 'SET_CONTROLS_OPEN',
    value,
  }),
};
