// ABOUTME: Action type definitions for visualization state
// ABOUTME: Represents user intentions and events, not just state mutations

import type { GovernmentScope } from '../data/datasets';

/**
 * User interaction actions - represent user intentions
 */

// Scope interactions
export type ScopeSelectedAction = {
  type: 'SCOPE_SELECTED';
  scope: GovernmentScope;
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

// NEW: Direct state update action for imperative handlers
export type StateUpdatedAction = {
  type: 'STATE_UPDATED';
  payload: Partial<import('./useVisualizationState').VisualizationState>;
};

/**
 * Union of all action types
 */
export type VisualizationAction =
  // User interaction actions
  | ScopeSelectedAction
  | ControlsToggledAction
  | SidebarHoverChangedAction
  | SelectionClearedAction
  // Internal state mutation actions
  | SetActiveScopeAction
  | SetSidebarHoverAction
  | ClearSelectionsAction
  | SetControlsOpenAction
  | StateUpdatedAction;

/**
 * Action creators - pure functions that create action objects
 */
export const actions = {
  // User interaction actions
  scopeSelected: (scope: GovernmentScope): ScopeSelectedAction => ({
    type: 'SCOPE_SELECTED',
    scope,
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
