// ABOUTME: Action types for all user interactions in the graph visualization
// ABOUTME: Single source of truth for what actions can be dispatched to the controller

import type { GovernmentScope } from '../../data/datasets';

// Base action structure
type Action<T extends string, P = undefined> = P extends undefined
  ? { type: T }
  : { type: T; payload: P };

// User interaction actions
export type NodeClickAction = Action<'NODE_CLICK', { nodeId: string }>;
export type EdgeClickAction = Action<'EDGE_CLICK', { edgeId: string }>;
export type BackgroundClickAction = Action<'BACKGROUND_CLICK'>;

// Subview actions
export type ActivateSubviewAction = Action<'ACTIVATE_SUBVIEW', { subviewId: string }>;
export type DeactivateSubviewAction = Action<'DEACTIVATE_SUBVIEW'>;

// Scope actions
export type ChangeScopeAction = Action<'CHANGE_SCOPE', { scope: GovernmentScope }>;
export type ClearScopeAction = Action<'CLEAR_SCOPE'>;

// Selection actions
export type ClearSelectionsAction = Action<'CLEAR_SELECTIONS'>;

// View mode actions
export type ChangeViewModeAction = Action<'CHANGE_VIEW_MODE', { mode: 'diagram' | 'financials' | 'maps' }>;

// Control panel tab actions
export type ChangeControlPanelTabAction = Action<'CHANGE_CONTROL_PANEL_TAB', { tab: 'details' | 'processes' }>;

// Union of all possible actions
export type GraphAction =
  | NodeClickAction
  | EdgeClickAction
  | BackgroundClickAction
  | ActivateSubviewAction
  | DeactivateSubviewAction
  | ChangeScopeAction
  | ClearScopeAction
  | ClearSelectionsAction
  | ChangeViewModeAction
  | ChangeControlPanelTabAction;

// Action creators for convenience
export const actions = {
  nodeClick: (nodeId: string): NodeClickAction => ({
    type: 'NODE_CLICK',
    payload: { nodeId },
  }),

  edgeClick: (edgeId: string): EdgeClickAction => ({
    type: 'EDGE_CLICK',
    payload: { edgeId },
  }),

  backgroundClick: (): BackgroundClickAction => ({
    type: 'BACKGROUND_CLICK',
  }),

  activateSubview: (subviewId: string): ActivateSubviewAction => ({
    type: 'ACTIVATE_SUBVIEW',
    payload: { subviewId },
  }),

  deactivateSubview: (): DeactivateSubviewAction => ({
    type: 'DEACTIVATE_SUBVIEW',
  }),

  changeScope: (scope: GovernmentScope): ChangeScopeAction => ({
    type: 'CHANGE_SCOPE',
    payload: { scope },
  }),

  clearScope: (): ClearScopeAction => ({
    type: 'CLEAR_SCOPE',
  }),

  clearSelections: (): ClearSelectionsAction => ({
    type: 'CLEAR_SELECTIONS',
  }),

  changeViewMode: (mode: 'diagram' | 'financials' | 'maps'): ChangeViewModeAction => ({
    type: 'CHANGE_VIEW_MODE',
    payload: { mode },
  }),

  changeControlPanelTab: (tab: 'details' | 'processes'): ChangeControlPanelTabAction => ({
    type: 'CHANGE_CONTROL_PANEL_TAB',
    payload: { tab },
  }),
};
